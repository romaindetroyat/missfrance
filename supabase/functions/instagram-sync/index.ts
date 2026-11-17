// Collecte Instagram : pour chaque compte suivi (instagram_accounts : compte personnel de la candidate
// ou compte du comité régional), lit l'encart public du profil (/<compte>/embed/), qui donne le nombre
// d'abonnés et les dernières publications (carrousels compris, avec légendes).
//  - compte personnel : abonnés relevés (instagram_stats + historique) et toutes ses photos récupérées ;
//  - compte du comité : seules les publications dont la légende nomme la candidate ; les mentions
//    @compte de ces légendes servent à découvrir le compte personnel de la candidate.
// Les photos arrivent « en attente » : la vérification visuelle et le dédoublonnage s'appliquent ensuite.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const MAX_PER_ACCOUNT = 80;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9@._]+/g, " ").trim();

function unescape(t: string): string {
  for (let i = 0; i < 6; i++) {
    const n = t.replace(/\\(["\/\\])/g, "$1");
    if (n === t) break;
    t = n;
  }
  return t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\n/g, "\n");
}

type Img = { url: string; key: string; w: number; h: number };
type Media = { code: string; caption: string; images: Img[] };
type Profile = { fullName: string; followers: number | null; posts: number | null; media: Media[] };

const IMG_RE = /"dimensions":\{"height":(\d+),"width":(\d+)\},"display_url":"([^"]+)"/g;
const isProfilePic = (u: string) => /\/t51\.2885-19\/|s150x150|s320x320|profile_pic/.test(u);
const fileId = (u: string) => (/\/([^/?]+)\.(?:jpe?g|webp|png)/.exec(u)?.[1] || u).slice(0, 80);

// Toutes les images d'un fragment (publication, carrousel complet, couverture de reel), sans doublon
function imagesOf(code: string, t: string): Img[] {
  const seen = new Set<string>();
  const out: Img[] = [];
  for (const m of t.matchAll(IMG_RE)) {
    const url = m[3];
    if (isProfilePic(url)) continue;
    const id = fileId(url);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ url, key: `ig:${code}:${id}`, w: Number(m[2]), h: Number(m[1]) });
  }
  return out;
}
const captionOf = (t: string) => /"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:[^"\\]|\\.)*)"/.exec(t)?.[1] || "";

async function get(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { "User-Agent": BOT, "Accept-Language": "fr-FR,fr;q=0.9" }, signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!r || !r.ok) return null;
  return unescape(await r.text());
}

// Encart d'une publication : donne le carrousel en entier (l'encart du profil n'en montre qu'une partie)
async function post(code: string, fallback: Media): Promise<Media> {
  const t = await get(`https://www.instagram.com/p/${code}/embed/captioned/`);
  if (!t) return fallback;
  const images = imagesOf(code, t);
  const caption = captionOf(t) || fallback.caption;
  return images.length >= fallback.images.length ? { code, caption, images } : { ...fallback, caption };
}

async function profile(handle: string): Promise<Profile | null> {
  const t = await get(`https://www.instagram.com/${handle}/embed/`);
  if (!t) return null;
  const fullName = /"full_name":"([^"]*)"/.exec(t)?.[1] || "";
  const followers = Number(/"followers_count":(\d+)/.exec(t)?.[1] || /"edge_followed_by":\{"count":(\d+)\}/.exec(t)?.[1] || NaN);
  const posts = Number(/"posts_count":(\d+)/.exec(t)?.[1] || NaN);
  const media: Media[] = [];
  for (const ch of t.split('"shortcode_media":').slice(1)) {
    const code = /"shortcode":"([\w-]+)"/.exec(ch)?.[1];
    if (!code || media.some((m) => m.code === code)) continue;
    media.push({ code, caption: captionOf(ch), images: imagesOf(code, ch) });
  }
  return { fullName, followers: Number.isFinite(followers) ? followers : null, posts: Number.isFinite(posts) ? posts : null, media };
}

async function pool<T, R>(xs: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) { const k = i++; out[k] = await f(xs[k]); } }));
  return out;
}

function classify(text: string): string {
  const t = norm(text);
  if (/maillot|bikini|swimsuit|plage|beach/.test(t)) return "maillot";
  if (/voyage de preparation|saint martin|sxm|preparation miss france/.test(t)) return "voyage";
  if (/portrait officiel|photo officielle|shooting officiel/.test(t)) return "officiel";
  if (/elue|election|sacree|couronn|echarpe|sacre/.test(t)) return "election";
  return "autre";
}

async function storeImage(cid: string, handle: string, m: Media, img: Media["images"][0]): Promise<string> {
  const { data: known } = await sb.from("photos").select("id").eq("source_url", img.key).maybeSingle();
  if (known) return "dup";
  if (img.w && img.h && Math.min(img.w, img.h) < 320) return "petite";
  const res = await fetch(img.url, { headers: { "User-Agent": BOT }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return "http " + res.status;
  const type = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!/^image\/(jpeg|png|webp)$/.test(type)) return "type";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 15000) return "petite";
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data: same } = await sb.from("photos").select("id").eq("candidate_id", cid).eq("hash", hash).maybeSingle();
  if (same) return "dup";
  const path = `${cid}/ig-${hash}.${type.split("/")[1].replace("jpeg", "jpg")}`;
  const up = await sb.storage.from("photos").upload(path, buf, { contentType: type, upsert: true, cacheControl: "31536000" });
  if (up.error) return "stockage";
  const url = sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  const ins = await sb.from("photos").insert({
    candidate_id: cid, url, source_url: img.key, source_page: `https://www.instagram.com/p/${m.code}/`,
    credit: `instagram.com/${handle}`, type: classify(m.caption), caption: m.caption.slice(0, 200) || null, hash, bytes: buf.length,
    width: img.w || null, height: img.h || null,
  });
  return ins.error ? "base" : "ok";
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const t0 = Date.now();
  const { data: cands } = await sb.from("candidates").select("id,nom,region");
  const byId = new Map(cands!.map((c) => [c.id, c]));
  let q = sb.from("instagram_accounts").select("candidate_id,handle,kind,checked_at").order("checked_at", { ascending: true, nullsFirst: true }).limit(Number(body.limit) || 4);
  if (body.handle) q = sb.from("instagram_accounts").select("candidate_id,handle,kind,checked_at").eq("handle", body.handle);
  const { data: accounts } = await q;
  const report: unknown[] = [];

  for (const a of accounts || []) {
    if (Date.now() - t0 > 90000) break;
    const c = byId.get(a.candidate_id)!;
    const p = await profile(a.handle).catch(() => null);
    const r: Record<string, unknown> = { handle: a.handle, kind: a.kind };
    await sb.from("instagram_accounts").update({ checked_at: new Date().toISOString(), full_name: p?.fullName ?? null, followers: p?.followers ?? null, last_error: p ? null : "profil illisible" }).eq("handle", a.handle).eq("candidate_id", a.candidate_id);
    if (!p) { report.push({ ...r, error: "profil illisible" }); continue; }
    r.followers = p.followers; r.posts = p.media.length;

    const keys = [norm(c.nom), ...norm(c.nom).split(" ").slice(1).filter((x) => x.length >= 5)];
    const mentionsHer = (cap: string) => { const n = norm(cap); return keys.some((k) => n.includes(k)); };

    if (a.kind === "perso") {
      if (p.followers) {
        await sb.from("instagram_stats").upsert({ candidate_id: c.id, handle: a.handle, handle_source: "instagram", followers: p.followers, source: "instagram-embed", updated_at: new Date().toISOString() }, { onConflict: "candidate_id" });
        await sb.from("instagram_history").insert({ candidate_id: c.id, handle: a.handle, followers: p.followers, source: "instagram-embed" });
      }
    } else {
      // Découverte du compte personnel : mentions @compte dans les légendes qui la nomment
      const found = new Set<string>();
      for (const m of p.media) if (mentionsHer(m.caption)) for (const x of m.caption.matchAll(/@([A-Za-z0-9._]{3,30})/g)) found.add(x[1].replace(/\.$/, "").toLowerCase());
      found.delete(a.handle.toLowerCase());
      const last = norm(c.nom).split(" ").slice(1).join("").replace(/ /g, "");
      for (const h of found) {
        const flat = h.replace(/[^a-z0-9]/g, "");
        if (last.length >= 4 && flat.includes(last.slice(0, Math.min(6, last.length)))) {
          await sb.from("instagram_accounts").upsert({ candidate_id: c.id, handle: h, kind: "perso", source: `mention par @${a.handle}` }, { onConflict: "candidate_id,handle", ignoreDuplicates: true });
          r.discovered = h;
        }
      }
    }

    let ok = 0;
    const notes: Record<string, number> = {};
    const chosen = a.kind === "perso" ? p.media : p.media.filter((m) => mentionsHer(m.caption));
    const full = await pool(chosen, 6, (m) => post(m.code, m));
    const jobs = full.flatMap((m) => (a.kind === "perso" || mentionsHer(m.caption) ? m.images.map((img) => ({ m, img })) : [])).slice(0, MAX_PER_ACCOUNT);
    const res = await pool(jobs, 6, ({ m, img }) => Date.now() - t0 > 120000 ? Promise.resolve("temps") : storeImage(c.id, a.handle, m, img).catch(() => "erreur"));
    for (const o of res) if (o === "ok") ok++; else notes[o] = (notes[o] || 0) + 1;
    r.posts_seen = full.length; r.images_seen = jobs.length;
    r.added = ok; r.skipped = notes;
    report.push(r);
  }
  return Response.json({ ms: Date.now() - t0, report });
});
