// Collecteur de photos des candidates Miss France 2027.
// Deux sortes de sources, en file d'attente dans la table photo_sources :
//  - une page web (article, galerie) : on garde les images dont le texte alternatif, la légende
//    ou le nom de fichier désignent la candidate ;
//  - une recherche Bing Images (adresse bing.com/images/search) : on garde les résultats dont
//    le titre, la description ou la page d'origine contiennent le nom de la candidate.
// Chaque image retenue est copiée dans le stockage « photos », dédoublonnée par empreinte.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PER_SOURCE = 10;
const TARGET = 18; // au-delà, on n'ajoute plus de photos à une candidate
const MIN_BYTES = 20_000;
const MAX_BYTES = 12_000_000;
const BUDGET_MS = 120_000;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&[a-z#0-9]+;/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

type Cand = { id: string; nom: string; region: string };
type Hit = { url: string; page: string; why: string; official?: boolean };

const GENERIC = new Set(["saint", "pays", "ile", "cote", "nord", "centre", "nouvelle", "franche", "midi", "rhone", "poitou", "champagne"]);
function nameKeys(c: Cand) {
  const full = norm(c.nom);
  const parts = full.split(" ");
  const last = parts.slice(1).join(" ");
  const keys = [full, full.replace(/ /g, "")];
  if (last.length >= 6) keys.push(last);
  // nom de famille composé : « lucea merlin », « grid costantino »… et premier élément s'il est long
  if (parts.length > 2 && parts[1].length >= 6) keys.push(parts[1]);
  return [...new Set(keys)];
}
function regionFileKeys(c: Cand) {
  const r = norm(c.region);
  const first = r.split(" ")[0];
  const keys = [r, r.replace(/ /g, "_")];
  if (first.length >= 4) keys.push(first);
  return keys;
}
const fileOf = (u: string) => { try { return norm(decodeURIComponent(new URL(u).pathname.split("/").pop() || "")); } catch { return ""; } };

function absolute(u: string, base: string): string | null {
  try {
    const x = new URL(decode(u.replace(/\\\//g, "/")), base);
    return /^https?:$/.test(x.protocol) ? x.toString() : null;
  } catch { return null; }
}
function bestFromSrcset(srcset: string): string | null {
  let best: string | null = null, bw = -1;
  for (const part of srcset.split(",")) {
    const [u, d] = part.trim().split(/\s+/);
    const w = d ? parseFloat(d) : 0;
    if (u && w >= bw) { best = u; bw = w; }
  }
  return best;
}
const BAD = /(logo|sprite|icon|avatar|placeholder|pixel|blank|favicon|emoji|badge|banner|\/ads?\/|gravatar|\.svg|\.gif|data:|ytimg\.com|\/thumbnail_|\/small_|\/medium_|explicit\.bing\.net|\/th\?id=)/i;

function fromPage(html: string, page: string, c: Cand, dedicated: boolean): Hit[] {
  const nk = nameKeys(c), rk = regionFileKeys(c);
  const byName = (t: string) => { const n = norm(t); return nk.find((k) => n.includes(k)); };
  const out = new Map<string, Hit>();
  const add = (u: string | null | undefined, why: string, official = false) => {
    const abs = u && absolute(u, page);
    if (!abs || BAD.test(abs) || out.has(abs)) return;
    out.set(abs, { url: abs, page, why, official });
  };
  if (dedicated) {
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi)) {
      add(/content=["']([^"']+)["']/i.exec(m[0])?.[1], "og:image");
    }
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (let i = 0; i < imgs.length; i++) {
    const tag = imgs[i][0];
    const attr = (n: string) => new RegExp(`\\b${n}=["']([^"']*)["']`, "i").exec(tag)?.[1] || "";
    const srcset = attr("data-srcset") || attr("srcset");
    const src = (srcset && bestFromSrcset(srcset)) || attr("data-src") || attr("data-lazy-src") || attr("data-original") || attr("src");
    if (!src) continue;
    const alt = attr("alt") + " " + attr("title");
    let k = byName(alt) || byName(src);
    if (!k && dedicated) {
      const start = imgs[i].index! + tag.length;
      k = byName(strip(html.slice(start, Math.min(start + 400, imgs[i + 1]?.index ?? html.length))));
    }
    if (k) add(src, k);
  }
  // Images référencées dans des données embarquées (diaporamas, JSON)
  const raw = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  for (const m of raw.matchAll(/https?:\/\/[^"'\s\\<>()]+?\.(?:jpe?g|png|webp)(?:\?[^"'\s\\<>()]*)?/gi)) {
    const f = fileOf(m[0]);
    if (byName(f)) { add(m[0], "fichier"); continue; }
    // Page commune aux 31 candidates : fichier nommé d'après la région (portraits officiels)
    if (!dedicated && rk.some((k) => f.startsWith(k))) { add(m[0], "portrait", true); continue; }
    if (dedicated) {
      const ctx = strip(raw.slice(Math.max(0, m.index! - 200), m.index! + m[0].length + 200));
      const k = byName(ctx);
      if (k) add(m[0], "contexte");
    }
  }
  return [...out.values()];
}

function fromBing(html: string, c: Cand): Hit[] {
  const nk = nameKeys(c);
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/\bm="(\{[^"]*\})"/g)) {
    let d: Record<string, string>;
    try { d = JSON.parse(decode(m[1])); } catch { continue; }
    if (!d.murl || !d.purl || seen.has(d.murl) || BAD.test(d.murl)) continue;
    const text = norm(`${d.t || ""} ${d.desc || ""} ${decodeURIComponent(d.purl)}`);
    const k = nk.find((x) => text.includes(x));
    if (!k) continue;
    if (/instagram\.com|facebook\.com|tiktok\.com|pinterest\./i.test(d.purl) && !/\.(jpe?g|png|webp)/i.test(d.murl)) continue;
    seen.add(d.murl);
    out.push({ url: d.murl, page: d.purl, why: "bing:" + k });
  }
  return out;
}

function dims(buf: Uint8Array, type: string): [number, number] {
  try {
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (type.includes("png")) return [v.getUint32(16), v.getUint32(20)];
    if (type.includes("jp")) {
      let o = 2;
      while (o < buf.length - 9) {
        if (buf[o] !== 0xff) { o++; continue; }
        const mk = buf[o + 1];
        if (mk >= 0xc0 && mk <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(mk)) return [v.getUint16(o + 7), v.getUint16(o + 5)];
        o += 2 + v.getUint16(o + 2);
      }
    }
    if (type.includes("webp") && buf[12] === 0x56 && buf[13] === 0x50) {
      if (buf[15] === 0x38 && buf[14] === 0x38) return [v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff]; // VP8
      if (buf[15] === 0x4c) { const b = v.getUint32(21, true); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; } // VP8L
      if (buf[15] === 0x58) return [1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))]; // VP8X
    }
  } catch { /* format inconnu */ }
  return [0, 0];
}

async function store(c: Cand, hit: Hit): Promise<string> {
  const { data: known } = await sb.from("photos").select("id").eq("source_url", hit.url).maybeSingle();
  if (known) return "dup";
  const res = await fetch(hit.url, { headers: { "User-Agent": UA, Referer: hit.page, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return "http " + res.status;
  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(type)) return "type";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) return "petite";
  if (buf.length > MAX_BYTES) return "lourde";
  const [w, h] = dims(buf, type);
  if (w && h && (Math.min(w, h) < 320 || w / h > 2.2 || h / w > 2.6)) return "dimensions";
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data: same } = await sb.from("photos").select("id").eq("candidate_id", c.id).eq("hash", hash).maybeSingle();
  if (same) return "dup";
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const path = `${c.id}/${hash}.${ext}`;
  const up = await sb.storage.from("photos").upload(path, buf, { contentType: type, upsert: true, cacheControl: "31536000" });
  if (up.error) return "stockage";
  const url = sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  let host = "";
  try { host = new URL(hit.page).hostname.replace(/^www\./, ""); } catch { /* */ }
  const ins = await sb.from("photos").insert({
    candidate_id: c.id, url, source_url: hit.url, source_page: hit.page, credit: host,
    type: hit.official ? "portrait_officiel" : hit.why.startsWith("bing") ? "web" : "presse", hash, bytes: buf.length,
  });
  if (ins.error) return "base";
  if (hit.official) await sb.from("candidates").update({ portrait_url: url }).eq("id", c.id).is("portrait_url", null);
  return "ok";
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", Accept: "text/html,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("http " + res.status);
  return await res.text();
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const nPages = Math.min(Number(body.pages) || 3, 10);
  const t0 = Date.now();
  const report: unknown[] = [];

  for (let n = 0; n < nPages && Date.now() - t0 < BUDGET_MS * 0.6; n++) {
    const { data: next } = await sb.from("photo_sources").select("page_url").eq("status", "pending").order("id").limit(1);
    if (!next?.length) break;
    const page = next[0].page_url;
    const { data: rows } = await sb.from("photo_sources").select("id,candidate_id,dedicated").eq("page_url", page).eq("status", "pending");
    await sb.from("photo_sources").update({ status: "running" }).in("id", rows!.map((r) => r.id));
    let html = "", err = "";
    try { html = await getText(page); } catch (e) { err = String((e as Error).message || e).slice(0, 120); }
    const { data: cands } = await sb.from("candidates").select("id,nom,region").in("id", rows!.map((r) => r.candidate_id));
    const isBing = /bing\.com\/images\/search/.test(page);
    for (const r of rows!) {
      const c = cands!.find((x) => x.id === r.candidate_id)!;
      let found = 0;
      const notes: Record<string, number> = {};
      if (!err) {
        const { count } = await sb.from("photos").select("id", { count: "exact", head: true }).eq("candidate_id", c.id);
        const room = Math.max(0, Math.min(PER_SOURCE, TARGET - (count || 0)));
        const hits = isBing ? fromBing(html, c) : fromPage(html, page, c, r.dedicated);
        notes["trouvées"] = hits.length;
        for (let i = 0; i < hits.length && found < room && Date.now() - t0 < BUDGET_MS; i += 4) {
          const outs = await Promise.all(hits.slice(i, i + 4).map((h) => store(c, h).catch(() => "erreur")));
          for (const o of outs) { if (o === "ok") found++; else notes[o] = (notes[o] || 0) + 1; }
        }
      }
      const note = err || Object.entries(notes).map(([k, v]) => `${k} ${v}`).join(", ");
      await sb.from("photo_sources").update({ status: err ? "error" : "done", found, note: note.slice(0, 300), processed_at: new Date().toISOString() }).eq("id", r.id);
      report.push({ c: c.id, found, err: err || undefined });
    }
  }
  return new Response(JSON.stringify({ ms: Date.now() - t0, report }), { headers: { "Content-Type": "application/json" } });
});
