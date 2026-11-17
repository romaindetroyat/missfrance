// Planche contact pour la vérification des photos : en haut à gauche le portrait officiel
// (cadre doré), puis les photos à vérifier, de gauche à droite et de haut en bas.
// Accès protégé par la clé de revue (stockée en base, jamais exposée aux joueurs).
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLS = 5, ROWS = 4, W = 220, H = 275, GAP = 6;

async function tile(url, border) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(String(r.status));
    const buf = Buffer.from(await r.arrayBuffer());
    let img = sharp(buf).rotate().resize(W - 2 * border, H - 2 * border, { fit: "cover", position: "top" });
    if (border) img = img.extend({ top: border, bottom: border, left: border, right: border, background: "#d4a017" });
    return await img.jpeg({ quality: 82 }).toBuffer();
  } catch {
    return await sharp({ create: { width: W, height: H, channels: 3, background: "#7f1d1d" } }).jpeg().toBuffer();
  }
}

export async function GET(req) {
  const u = new URL(req.url);
  const sb = createClient(
    "https://gxopzeiigbqhdopztsgv.supabase.co",
    "sb_publishable_PuCqto4auWV1PLgSdp0Lcg_ykrKIEKg"
  );
  const { data, error } = await sb.rpc("review_batch", {
    p_key: u.searchParams.get("key") || "",
    p_candidate: u.searchParams.get("c") || "",
    p_limit: COLS * ROWS - 1,
    p_offset: Number(u.searchParams.get("offset") || 0),
  });
  if (error) return new Response(error.message, { status: 500 });
  if (!data?.length) return new Response("rien à vérifier", { status: 404 });
  const urls = [data[0].ref_url, ...data.map((d) => d.url)];
  const tiles = await Promise.all(urls.map((x, i) => tile(x, i === 0 ? 8 : 0)));
  const rows = Math.ceil(tiles.length / COLS);
  const img = await sharp({ create: { width: COLS * W + (COLS + 1) * GAP, height: rows * H + (rows + 1) * GAP, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, i) => ({ input: t, left: GAP + (i % COLS) * (W + GAP), top: GAP + Math.floor(i / COLS) * (H + GAP) })))
    .jpeg({ quality: 80 })
    .toBuffer();
  return new Response(img, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Photo-Ids": data.map((d) => d.id).join(",") },
  });
}
