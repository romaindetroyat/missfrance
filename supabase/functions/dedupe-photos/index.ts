// Dédoublonnage des photos : calcule une empreinte visuelle (dHash 64 bits) de chaque photo
// à partir d'une miniature 9×8 en niveaux de gris (service wsrv.nl), puis, pour chaque candidate,
// regroupe les photos visuellement identiques (même image en plusieurs tailles ou compressions)
// et ne garde que celle de meilleure résolution. Les doublons sont masqués (hidden) et leur
// fichier supprimé du stockage ; la ligne reste pour que le collecteur ne les retélécharge pas.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MAX_DIST = 8; // bits différents tolérés sur 64
const BATCH = 30;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

// Décode un petit PNG 8 bits (gris, gris+alpha, RVB, RVBA) en niveaux de gris.
async function pngGray(buf: Uint8Array): Promise<{ w: number; h: number; px: number[] }> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 8, w = 0, h = 0, ct = 0, depth = 0;
  const idat: Uint8Array[] = [];
  while (o < buf.length) {
    const len = v.getUint32(o), type = String.fromCharCode(...buf.slice(o + 4, o + 8));
    const d = buf.slice(o + 8, o + 8 + len);
    if (type === "IHDR") { w = v.getUint32(o + 8); h = v.getUint32(o + 12); depth = buf[o + 16]; ct = buf[o + 17]; }
    if (type === "IDAT") idat.push(d);
    if (type === "IEND") break;
    o += 12 + len;
  }
  if (depth !== 8) throw new Error("profondeur " + depth);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct as 0 | 2 | 4 | 6];
  if (!ch) throw new Error("type " + ct);
  const all = new Uint8Array(idat.reduce((s, x) => s + x.length, 0));
  let p = 0; for (const x of idat) { all.set(x, p); p += x.length; }
  const raw = await inflate(all);
  const stride = w * ch, img = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? img[y * stride + x - ch] : 0, b = y ? img[(y - 1) * stride + x] : 0, c = x >= ch && y ? img[(y - 1) * stride + x - ch] : 0;
      let val = row[x];
      if (f === 1) val += a; else if (f === 2) val += b; else if (f === 3) val += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); val += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      img[y * stride + x] = val & 255;
    }
  }
  const px: number[] = [];
  for (let i = 0; i < w * h; i++) px.push(ch >= 3 ? (img[i * ch] * 299 + img[i * ch + 1] * 587 + img[i * ch + 2] * 114) / 1000 : img[i * ch]);
  return { w, h, px };
}

async function fingerprint(url: string): Promise<{ phash: string; width: number; height: number }> {
  const enc = encodeURIComponent(url);
  const [meta, png] = await Promise.all([
    fetch(`https://wsrv.nl/?url=${enc}&output=json`, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.json() : Promise.reject(new Error("meta " + r.status))),
    fetch(`https://wsrv.nl/?url=${enc}&w=9&h=8&fit=fill&filt=greyscale&output=png`, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.arrayBuffer() : Promise.reject(new Error("png " + r.status))),
  ]);
  const { w, h, px } = await pngGray(new Uint8Array(png));
  if (w !== 9 || h !== 8) throw new Error(`miniature ${w}x${h}`);
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  const phash = BigInt("0b" + bits).toString(16).padStart(16, "0");
  return { phash, width: meta.width, height: meta.height };
}

function dist(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

type Photo = { id: number; candidate_id: string; url: string; type: string; phash: string | null; width: number | null; height: number | null; bytes: number | null };

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const t0 = Date.now();

  // 1. Empreintes manquantes
  const { data: todo } = await sb.from("photos").select("id,candidate_id,url").is("phash", null).eq("hidden", false).order("id").limit(BATCH);
  const touched = new Set<string>();
  let printed = 0, failed = 0;
  for (let i = 0; i < (todo || []).length; i += 6) {
    await Promise.all(todo!.slice(i, i + 6).map(async (p) => {
      try {
        const f = await fingerprint(p.url);
        await sb.from("photos").update(f).eq("id", p.id);
        printed++;
      } catch (e) {
        await sb.from("photos").update({ phash: "erreur", width: null }).eq("id", p.id);
        failed++;
        console.error(p.id, String((e as Error).message || e));
      }
      touched.add(p.candidate_id);
    }));
  }

  // 2. Regroupement des doublons, candidate par candidate
  let hidden = 0;
  const body = await req.json().catch(() => ({}));
  const cands = body.all ? (await sb.from("candidates").select("id")).data!.map((c) => c.id) : [...touched];
  for (const cid of cands) {
    const { data: photos } = await sb.from("photos").select("id,candidate_id,url,type,phash,width,height,bytes").eq("candidate_id", cid).eq("hidden", false).not("phash", "is", null).neq("phash", "erreur");
    const list = (photos || []) as Photo[];
    const quality = (p: Photo) => (p.width || 0) * (p.height || 0) * 1e3 + (p.bytes || 0) / 1e3;
    list.sort((a, b) => quality(b) - quality(a)); // la meilleure d'abord
    const kept: Photo[] = [];
    for (const p of list) {
      const twin = kept.find((k) => dist(k.phash!, p.phash!) <= MAX_DIST);
      if (!twin) { kept.push(p); continue; }
      // p est un doublon de moindre qualité : on garde twin, en lui transmettant la catégorie la plus précise
      if (p.type === "officiel" && twin.type !== "officiel") { await sb.from("photos").update({ type: "officiel" }).eq("id", twin.id); twin.type = "officiel"; }
      else if (twin.type === "autre" && p.type !== "autre") { await sb.from("photos").update({ type: p.type }).eq("id", twin.id); twin.type = p.type; }
      await sb.from("candidates").update({ portrait_url: twin.url }).eq("id", cid).eq("portrait_url", p.url);
      const path = p.url.split("/object/public/photos/")[1];
      if (path) await sb.storage.from("photos").remove([decodeURIComponent(path)]);
      await sb.from("photos").update({ hidden: true, duplicate_of: twin.id }).eq("id", p.id);
      hidden++;
    }
  }
  return new Response(JSON.stringify({ ms: Date.now() - t0, printed, failed, hidden, remaining: (todo || []).length === BATCH }), { headers: { "Content-Type": "application/json" } });
});
