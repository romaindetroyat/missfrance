// Popularité Instagram des candidates : retrouve l'identifiant de chaque candidate dans les articles
// de présentation (liens instagram.com), puis relève le nombre d'abonnés via plusieurs sources
// publiques, et l'enregistre (instagram_stats + historique instagram_history).
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MOBILE = "Instagram 309.1.0.41.113 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; fr_FR; 541635890)";
const RESERVED = new Set(["p", "reel", "reels", "explore", "accounts", "stories", "tv", "missfrance", "missfranceofficiel", "tf1", "cnews", "planetfr", "about", "legal", "direct", "developer"]);

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");

async function get(url: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string; final: string }> {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", ...headers }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  return { status: r.status, text: await r.text(), final: r.url };
}

// « 12,3 k », « 1.2M », « 12 345 », « 12345 »
function parseCount(s: string): number | null {
  const m = s.replace(/ | /g, " ").trim().match(/^([\d][\d\s.,]*)\s*([kKmM]|mille|millions?)?$/);
  if (!m) return null;
  let num = m[1].replace(/\s/g, "");
  const unit = (m[2] || "").toLowerCase();
  if (unit) num = num.replace(",", ".");
  else num = num.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  const v = parseFloat(num);
  if (!isFinite(v)) return null;
  const mult = unit.startsWith("k") || unit === "mille" ? 1e3 : unit.startsWith("m") ? 1e6 : 1;
  return Math.round(v * mult);
}

type Cand = { id: string; nom: string; region: string };

function matchCandidate(handle: string, context: string, cands: Cand[]): Cand | null {
  const h = handle.toLowerCase().replace(/[^a-z0-9]/g, "");
  // 1. le nom de famille (ou le prénom long) dans l'identifiant
  for (const c of cands) {
    const parts = norm(c.nom).split(" ");
    const last = parts.slice(1).join("").replace(/ /g, "");
    if (last.length >= 4 && h.includes(last)) return c;
    if (parts.slice(1).some((p) => p.length >= 5 && h.includes(p))) return c;
  }
  // 2. le nom complet dans le texte qui précède le lien
  const ctx = norm(context);
  let best: Cand | null = null, bestPos = -1;
  for (const c of cands) {
    const pos = ctx.lastIndexOf(norm(c.nom));
    if (pos > bestPos) { bestPos = pos; best = c; }
  }
  return bestPos >= 0 ? best : null;
}

async function discover(cands: Cand[], pages: string[]): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  for (const page of pages) {
    let html = "";
    try { html = (await get(page)).text; } catch { continue; }
    for (const m of html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{3,30})/g)) {
      const handle = m[1].replace(/\.$/, "");
      if (RESERVED.has(handle.toLowerCase())) continue;
      const ctx = strip(html.slice(Math.max(0, m.index! - 1500), m.index!));
      const c = matchCandidate(handle, ctx, cands);
      if (c && !found[c.id]) found[c.id] = handle;
    }
  }
  return found;
}

async function followers(handle: string): Promise<{ n: number | null; source: string; note: string }> {
  const notes: string[] = [];
  const tries: [string, () => Promise<number | null>][] = [
    ["instagram-api", async () => {
      const r = await get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, { "User-Agent": MOBILE, "x-ig-app-id": "936619743392459", Accept: "*/*" });
      notes.push("api " + r.status);
      const m = r.text.match(/"edge_followed_by":\{"count":(\d+)/);
      return m ? +m[1] : null;
    }],
    ["instagram-embed", async () => {
      const r = await get(`https://www.instagram.com/${handle}/embed/`);
      notes.push("embed " + r.status);
      const m = r.text.match(/\\?"followers_count\\?":\s*(\d+)/) || r.text.match(/"edge_followed_by":\{"count":(\d+)/);
      if (m) return +m[1];
      const t = strip(r.text).match(/([\d][\d\s.,]*\s*[kKmM]?)\s*(?:followers|abonnés|abonné\(e\)s)/i);
      return t ? parseCount(t[1]) : null;
    }],
    ["instagram-page", async () => {
      const r = await get(`https://www.instagram.com/${handle}/`, { "User-Agent": "facebookexternalhit/1.1" });
      notes.push("page " + r.status + (r.final.includes("login") ? " login" : ""));
      const m = r.text.match(/content="([\d][\d\s.,]*\s*[kKmM]?)\s*(?:Followers|abonnés)/i);
      return m ? parseCount(m[1]) : null;
    }],
    ["imginn", async () => {
      const r = await get(`https://imginn.com/${handle}/`);
      notes.push("imginn " + r.status);
      const t = strip(r.text).match(/([\d][\d\s.,]*\s*[kKmM]?)\s*(?:followers|abonnés)/i);
      return t ? parseCount(t[1]) : null;
    }],
    ["picuki", async () => {
      const r = await get(`https://www.picuki.com/profile/${handle}`);
      notes.push("picuki " + r.status);
      const m = r.text.match(/class="followed_by"[^>]*>([^<]+)</i) || strip(r.text).match(/([\d][\d\s.,]*\s*[kKmM]?)\s*followers/i);
      return m ? parseCount(m[1]) : null;
    }],
  ];
  for (const [name, fn] of tries) {
    try {
      const n = await fn();
      if (n != null && n > 0) return { n, source: name, note: notes.join(", ") };
    } catch (e) { notes.push(name + " erreur " + String((e as Error).message || e).slice(0, 40)); }
  }
  return { n: null, source: "", note: notes.join(", ") };
}

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { data: cands } = await sb.from("candidates").select("id,nom,region");
  const report: Record<string, unknown> = {};

  if (body.discover) {
    const pages: string[] = body.pages || [];
    const found = await discover(cands!, pages);
    for (const [cid, handle] of Object.entries(found)) {
      await sb.from("instagram_stats").upsert({ candidate_id: cid, handle, handle_source: "articles" }, { onConflict: "candidate_id", ignoreDuplicates: true });
    }
    report.discovered = found;
  }

  if (body.counts) {
    const { data: rows } = await sb.from("instagram_stats").select("candidate_id,handle").not("handle", "is", null);
    const out: Record<string, unknown> = {};
    for (let i = 0; i < rows!.length; i += 6) {
      await Promise.all(rows!.slice(i, i + 6).map(async (r) => {
        const f = await followers(r.handle);
        out[r.candidate_id] = f;
        await sb.from("instagram_stats").update({ followers: f.n, source: f.source || null, note: f.note, updated_at: new Date().toISOString() }).eq("candidate_id", r.candidate_id);
        if (f.n) await sb.from("instagram_history").insert({ candidate_id: r.candidate_id, handle: r.handle, followers: f.n, source: f.source });
      }));
    }
    report.counts = out;
  }
  return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
});
