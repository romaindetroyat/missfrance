// Miniatures stockées : une version légère (480 px de large, WebP) de chaque photo et de chaque portrait officiel,
// rangée dans le stockage sous « t/… ». Le site les affiche directement, sans dépendre d'un service extérieur
// pendant la navigation. Lancée chaque minute par pg_cron tant qu'il reste des photos sans miniature.
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STORE = "/storage/v1/object/public/photos/";
const W = 480;
const thumbOf = (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${W}&we&q=75&output=webp`;

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

// Fabrique et range la miniature ; renvoie son adresse publique ou un code d'erreur
async function make(url: string): Promise<{ url?: string; err?: string }> {
  const path = url.split(STORE)[1];
  if (!path) return { err: "hors stockage" };
  const res = await fetch(thumbOf(url), { signal: AbortSignal.timeout(30000) });
  if (res.status === 429) return { err: "429" };
  if (!res.ok) return { err: "http " + res.status };
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 500) return { err: "vide" };
  const tpath = "t/" + decodeURIComponent(path).replace(/\.[a-z0-9]+$/i, "") + ".webp";
  const up = await sb.storage.from("photos").upload(tpath, buf, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (up.error) return { err: "stockage" };
  return { url: sb.storage.from("photos").getPublicUrl(tpath).data.publicUrl };
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const t0 = Date.now();
  const out: Record<string, number> = {};
  const count = (k: string) => { out[k] = (out[k] || 0) + 1; };
  let limited = false;

  // Portraits officiels d'abord (ils sont partout sur le site)
  const { data: cands } = await sb.from("candidates").select("id,portrait_url").is("portrait_thumb", null).like("portrait_url", `%${STORE}%`);
  for (const c of cands || []) {
    const r = await make(c.portrait_url).catch(() => ({ err: "erreur" }));
    if (r.url) { await sb.from("candidates").update({ portrait_thumb: r.url }).eq("id", c.id); count("portraits"); }
    else { count("portrait " + r.err); if (r.err === "429") { limited = true; break; } }
  }

  const { data: todo } = limited ? { data: [] } : await sb.from("photos").select("id,url").eq("review", "ok").eq("hidden", false)
    .is("thumb_url", null).like("url", `%${STORE}%`).order("id").limit(Number(body.limit) || 150);
  await pool(todo || [], 6, async (p) => {
    if (limited || Date.now() - t0 > 50000) return;
    const r = await make(p.url).catch(() => ({ err: "erreur" }));
    if (r.url) { await sb.from("photos").update({ thumb_url: r.url }).eq("id", p.id); count("photos"); }
    else { count(r.err || "erreur"); if (r.err === "429") limited = true; } // plafond du service : on reprendra à la minute suivante
  });

  const { count: left } = await sb.from("photos").select("id", { count: "exact", head: true })
    .eq("review", "ok").eq("hidden", false).is("thumb_url", null).like("url", `%${STORE}%`);
  return Response.json({ ms: Date.now() - t0, ...out, restantes: left });
});
