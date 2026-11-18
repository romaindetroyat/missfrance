// Import des photos Instagram déposées dans le dossier Google Drive « Instagram » (partagé par lien).
// Le dossier contient un sous-dossier par compte (« @handle »), rempli de photos nommées
// <code de la publication>_<n°>.jpg. À chaque passage :
//  1. relevé des sous-dossiers et de leurs fichiers (vue publique du dossier), nouveaux fichiers notés dans drive_files ;
//  2. inscription d'un lot de nouveaux fichiers : écarte les trop petites et les formats inconnus, crée les
//     autres « en attente » en pointant vers l'aperçu Google (rien n'est stocké à ce stade) ;
//     la vérification visuelle (candidate seule, nette, bien cadrée ; portrait / maillot…) et le
//     dédoublonnage passent ensuite ;
//  3. copie dans le stockage du site des seules photos acceptées et non doublons (1200 px max, WebP qualité 80) ;
//  4. ménage : fichiers des photos rejetées ou en doublon retirés du stockage.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ROOT = "1iJWe6CZxAHfzSEb4qdvVsr9RzxVWP-Cp"; // dossier « Instagram » du Drive (le premier a été vidé et supprimé)
const MIN_SIDE = 640; // en dessous : trop basse qualité
const MIN_BYTES = 40000;

const html = async (id: string) => {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`dossier ${id} : ${r.status}`);
  return r.text();
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
function entries(t: string) {
  const out: { id: string; name: string; folder: boolean }[] = [];
  for (const m of t.matchAll(/id="entry-([\w-]+)"[\s\S]*?href="([^"]+)"[\s\S]*?class="flip-entry-title">([^<]*)</g)) {
    out.push({ id: m[1], name: decode(m[3]), folder: m[2].includes("/folders/") });
  }
  return out;
}

// Dimensions d'un JPEG (segment SOF), PNG ou WebP
function dims(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], h: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23] };
  if (b[0] === 0x52 && b[8] === 0x57) { // RIFF....WEBP
    if (b[12] === 0x56 && b[15] === 0x58) return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (b[15] === 0x20) return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
    return null;
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o < b.length - 9) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[o + 5] << 8) | b[o + 6], w: (b[o + 7] << 8) | b[o + 8] };
    o += 2 + ((b[o + 2] << 8) | b[o + 3]);
  }
  return null;
}
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const kind = (b: Uint8Array) => (b[0] === 0xff && b[1] === 0xd8 ? "jpg" : b[0] === 0x89 && b[1] === 0x50 ? "png" : b[0] === 0x52 && b[8] === 0x57 ? "webp" : null);

async function pool<T>(xs: T[], n: number, f: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) await f(xs[i++]); }));
}

async function scan(report: Record<string, unknown>) {
  const { data: accts } = await sb.from("instagram_accounts").select("candidate_id,handle");
  const byHandle = new Map((accts || []).map((a) => [a.handle.toLowerCase(), a.candidate_id]));
  const { data: known } = await sb.from("drive_files").select("id");
  const seen = new Set((known || []).map((k) => k.id));
  const folders = entries(await html(ROOT)).filter((e) => e.folder);
  let added = 0;
  await pool(folders, 6, async (f) => {
    const handle = f.name.replace(/^@/, "").toLowerCase();
    const files = entries(await html(f.id)).filter((e) => !e.folder && !e.name.startsWith("."));
    const fresh = files.filter((x) => !seen.has(x.id)).map((x) => ({
      id: x.id, folder_id: f.id, handle, candidate_id: byHandle.get(handle) ?? null, name: x.name,
      status: byHandle.has(handle) ? "new" : "sans_candidate",
    }));
    if (fresh.length) { await sb.from("drive_files").upsert(fresh, { onConflict: "id", ignoreDuplicates: true }); added += fresh.length; }
  });
  report.folders = folders.length;
  report.new_files = added;
}

const lh3 = (id: string, size: string) => `https://lh3.googleusercontent.com/d/${id}=${size}`;

async function importOne(f: { id: string; name: string; handle: string; candidate_id: string }): Promise<string> {
  const set = (v: Record<string, unknown>) => sb.from("drive_files").update({ ...v, processed_at: new Date().toISOString() }).eq("id", f.id);
  const res = await fetch(lh3(f.id, "s0"), { signal: AbortSignal.timeout(40000) });
  if (!res.ok) { await set({ status: "erreur", note: `http ${res.status}` }); return "erreur"; }
  const buf = new Uint8Array(await res.arrayBuffer());
  const ext = kind(buf);
  if (!ext) { await set({ status: "format", note: (res.headers.get("content-type") || "").slice(0, 60), bytes: buf.length }); return "format"; }
  const d = dims(buf);
  if (!d || Math.min(d.w, d.h) < MIN_SIDE || buf.length < MIN_BYTES) {
    await set({ status: "petite", width: d?.w ?? null, height: d?.h ?? null, bytes: buf.length });
    return "petite";
  }
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data: same } = await sb.from("photos").select("id").eq("candidate_id", f.candidate_id).eq("hash", hash).limit(1).maybeSingle();
  if (same) { await set({ status: "doublon", note: "fichier identique", photo_id: same.id, width: d.w, height: d.h, bytes: buf.length }); return "doublon"; }
  const code = /^([A-Za-z0-9_-]{9,14})_\d+\./.exec(f.name)?.[1];
  const { data: row, error } = await sb.from("photos").insert({
    candidate_id: f.candidate_id, url: lh3(f.id, "w1600"), source_url: `drive:${f.id}`,
    source_page: code ? `https://www.instagram.com/p/${code}/` : `https://www.instagram.com/${f.handle}/`,
    credit: `instagram.com/${f.handle}`, type: "autre", hash, bytes: buf.length, width: d.w, height: d.h,
  }).select("id").single();
  if (error) { await set({ status: "erreur", note: "base : " + error.message.slice(0, 100) }); return "erreur"; }
  await set({ status: "imported", photo_id: row.id, width: d.w, height: d.h, bytes: buf.length });
  return "imported";
}

// Copie dans le stockage du site d'une photo acceptée (et passée au dédoublonnage)
// Format de stockage : 1200 px maximum, WebP qualité 80 (assez pour l'écran, 3 à 4 fois plus léger que l'original)
const slim = (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&h=1200&fit=inside&we&q=80&output=webp`;

async function promote(p: { id: number; candidate_id: string; url: string; hash: string }): Promise<string> {
  const res = await fetch(slim(p.url), { signal: AbortSignal.timeout(40000) });
  if (!res.ok) return "http " + res.status;
  const buf = new Uint8Array(await res.arrayBuffer());
  const ext = kind(buf);
  if (!ext) return "format";
  const d = dims(buf);
  const path = `${p.candidate_id}/drive-${p.hash}.${ext}`;
  const up = await sb.storage.from("photos").upload(path, buf, { contentType: MIME[ext], upsert: true, cacheControl: "31536000" });
  if (up.error) return "stockage";
  // Ancienne copie en JPEG (avant le passage au WebP) : supprimée
  if (ext !== "jpg") await sb.storage.from("photos").remove([`${p.candidate_id}/drive-${p.hash}.jpg`]);
  const url = sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("photos").update({ url, bytes: buf.length, ...(d ? { width: d.w, height: d.h } : {}) }).eq("id", p.id);
  return error ? "base" : "copiée";
}

const STORE = "/storage/v1/object/public/photos/";
async function cleanup(): Promise<number> {
  const { data } = await sb.from("photos").select("id,url,source_url").or("review.eq.rejected,hidden.eq.true").like("url", `%${STORE}%`).limit(200);
  if (!data?.length) return 0;
  const paths = data.map((p) => decodeURIComponent(p.url.split(STORE)[1]));
  const { error } = await sb.storage.from("photos").remove(paths);
  if (error) return 0;
  for (const p of data) {
    // Photo du Drive : on repointe vers l'aperçu Google, pour pouvoir la réexaminer plus tard
    const drive = p.source_url?.startsWith("drive:") ? lh3(p.source_url.slice(6), "w1600") : null;
    await sb.from("photos").update(drive ? { url: drive } : { url: `retire:${p.id}:${p.url}`.slice(0, 500) }).eq("id", p.id);
  }
  return data.length;
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const t0 = Date.now();
  const report: Record<string, unknown> = {};
  // Relevé complet du dossier une fois sur cinq (ou sur demande)
  if (body.scan === true || (body.scan !== false && new Date().getMinutes() % 5 === 0)) await scan(report).catch((e) => { report.scan_error = String(e?.message || e); });
  // Lot réservé (aucun autre passage ne le prendra en même temps)
  const { data: todo } = await sb.rpc("drive_claim", { p_limit: Number(body.limit) || 40 });
  const counts: Record<string, number> = {};
  await pool(todo || [], 6, async (f) => {
    if (Date.now() - t0 > 100000) return;
    const o = await importOne(f as never).catch(async (e) => {
      await sb.from("drive_files").update({ status: "erreur", note: String(e?.message || e).slice(0, 120) }).eq("id", f.id);
      return "erreur";
    });
    counts[o] = (counts[o] || 0) + 1;
  });
  // Photos acceptées, empreinte calculée (dédoublonnage passé), pas masquées : copie sur le site
  const { data: ready } = await sb.from("photos").select("id,candidate_id,url,hash").eq("review", "ok").eq("hidden", false)
    .like("url", "https://lh3.googleusercontent.com/%").not("phash", "is", null).limit(Number(body.promote) || 30);
  const promoted: Record<string, number> = {};
  await pool(ready || [], 6, async (p) => {
    if (Date.now() - t0 > 135000) return;
    const o = await promote(p as never).catch(() => "erreur");
    promoted[o] = (promoted[o] || 0) + 1;
  });
  // Ménage : fichiers des photos rejetées ou en doublon retirés du stockage (la ligne reste)
  const cleaned = body.cleanup === false ? 0 : await cleanup();
  const { count } = await sb.from("drive_files").select("id", { count: "exact", head: true }).in("status", ["new", "en_cours"]);
  return Response.json({ ms: Date.now() - t0, ...report, processed: counts, promoted, cleaned, remaining: count });
});
