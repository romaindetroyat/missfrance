// Recalcul des probabilités et des cotes.
// Force d'une candidate = score de base du modèle historique (model/model.py, Plackett-Luce sur 2010-2026)
//   + somme des signaux de la saison (table candidate_signals : presse, sites de fans, parcours… ; poids documentés)
//   + popularité Instagram (instagram_stats)
//   + couverture médiatique mesurée par la collecte de photos (photos vérifiées, sites distincts), mise à jour tous les 3 jours.
// Un bonus de +0,69 double la force relative. Simulation Plackett-Luce (astuce de Gumbel), 60 000 tirages.
// Les cotes sont figées au verrouillage des pronostics (sauf appel forcé). Chaque calcul est historisé (tendances).
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const N_SIM = 60_000;
const IG_RANK_BONUS = [2.1, 0.7, 0.35]; // calé pour qu'une n° 1 isolée et moyenne par ailleurs ait ~60 % de Top 5
const IG_MIN_FOR_RANK = 25;
const MEDIA_WEIGHT = 0.22; // par écart-type de log(1 + sites distincts)
const MEDIA_CAP = 0.35;

const zscores = (xs: (number | null)[]) => {
  const k = xs.filter((x): x is number => x !== null);
  if (k.length < 5) return xs.map(() => null);
  const mu = k.reduce((a, b) => a + b, 0) / k.length;
  const sd = Math.sqrt(k.reduce((a, b) => a + (b - mu) ** 2, 0) / (k.length - 1)) || 1;
  return xs.map((x) => (x === null ? null : (x - mu) / sd));
};
const clip = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const fmt = (b: number) => `${b >= 0 ? "+" : ""}${b.toFixed(2)}`;

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { data: st } = await sb.from("settings").select("ceremony_at").eq("id", 1).single();
  if (!body.force && st && Date.now() >= new Date(st.ceremony_at).getTime()) {
    return Response.json({ skipped: "cotes figées depuis le verrouillage" });
  }

  const { data: cands } = await sb.from("candidates").select("id,nom,score_base,p_top5").order("id");
  const n = cands!.length;
  const idx = new Map(cands!.map((c, i) => [c.id, i]));
  const bonus = new Array(n).fill(0);
  const notes: string[][] = cands!.map(() => []);
  const add = (i: number, b: number, why: string) => { bonus[i] += b; if (Math.abs(b) >= 0.005) notes[i].push(`${why} (${fmt(b)})`); };

  // 1. Signaux de la saison
  const { data: sig } = await sb.from("candidate_signals").select("candidate_id,key,bonus,note");
  for (const s of sig || []) {
    const i = idx.get(s.candidate_id);
    if (i !== undefined && Number(s.bonus)) add(i, Number(s.bonus), s.note || s.key);
  }

  // 2. Instagram
  const { data: ig } = await sb.from("instagram_stats").select("candidate_id,followers");
  const fol = new Map((ig || []).filter((r) => r.followers > 0).map((r) => [r.candidate_id, r.followers as number]));
  const igz = zscores(cands!.map((c) => (fol.has(c.id) ? Math.log(fol.get(c.id)!) : null)));
  igz.forEach((z, i) => { if (z !== null) add(i, clip(0.15 * z, -0.3, 0.45), `Instagram ${fol.get(cands![i].id)!.toLocaleString("fr-FR")} abonnés`); });
  if (fol.size >= IG_MIN_FOR_RANK) {
    // La plus suivie a fini 1re ou 2e lors des 3 éditions documentées. Si les deux premières sont au coude-à-coude,
    // le bonus est partagé (g = 0 : égalité parfaite ; g = 1 : 30 % d'abonnés d'avance ou plus).
    const order = cands!.map((c, i) => [fol.get(c.id) ?? -1, i]).sort((a, b) => b[0] - a[0]);
    const g = clip((order[0][0] / Math.max(1, order[1][0]) - 1) / 0.3, 0, 1);
    const mid = (IG_RANK_BONUS[0] + IG_RANK_BONUS[1]) / 2, half = (IG_RANK_BONUS[0] - IG_RANK_BONUS[1]) / 2;
    add(order[0][1], mid + half * g, "n° 1 sur Instagram");
    add(order[1][1], mid - half * g, "n° 2 sur Instagram");
    add(order[2][1], IG_RANK_BONUS[2], "n° 3 sur Instagram");
  }

  // 3. Couverture médiatique (collecte de photos, tous les 3 jours)
  const { data: media } = await sb.rpc("media_stats");
  const mz = zscores(cands!.map((c) => { const m = (media || []).find((x: { candidate_id: string }) => x.candidate_id === c.id); return m ? Math.log(1 + m.domains) : null; }));
  mz.forEach((z, i) => {
    if (z === null) return;
    const m = (media || []).find((x: { candidate_id: string }) => x.candidate_id === cands![i].id);
    add(i, clip(MEDIA_WEIGHT * z, -MEDIA_CAP, MEDIA_CAP), `couverture médiatique : ${m.photos} photos vérifiées sur ${m.domains} sites`);
  });

  // Simulation
  const s = cands!.map((c, i) => Number(c.score_base || 0) + bonus[i]);
  const counts = Array.from({ length: n }, () => [0, 0, 0, 0, 0]);
  const v = new Float64Array(n);
  for (let k = 0; k < N_SIM; k++) {
    for (let i = 0; i < n; i++) v[i] = s[i] - Math.log(-Math.log(Math.random() || 1e-12));
    for (let r = 0; r < 5; r++) {
      let best = 0;
      for (let i = 1; i < n; i++) if (v[i] > v[best]) best = i;
      counts[best][r]++;
      v[best] = -Infinity;
    }
  }
  const now = new Date().toISOString();
  const out = [];
  const hist = [];
  for (let i = 0; i < n; i++) {
    const pr = counts[i].map((x) => x / N_SIM);
    const p5 = pr.reduce((a, b) => a + b, 0);
    const cote = Math.round(clip(1 / Math.max(p5, 1e-6), 1.5, 15) * 10) / 10;
    const prev = Number(cands![i].p_top5) || p5;
    const row = {
      p_rang: pr.map((x) => Math.round(x * 1e4) / 1e4), p_victoire: Math.round(pr[0] * 1e4) / 1e4, p_top5: Math.round(p5 * 1e4) / 1e4,
      cote, bonus: Math.round(bonus[i] * 1000) / 1000, bonus_note: notes[i].join(" ; ") || null, odds_updated_at: now,
      trend: Math.round((p5 - prev) * 1e4) / 1e4,
    };
    await sb.from("candidates").update(row).eq("id", cands![i].id);
    hist.push({ candidate_id: cands![i].id, p_victoire: row.p_victoire, p_top5: row.p_top5, cote });
    out.push({ id: cands![i].id, ...row });
  }
  await sb.from("odds_history").insert(hist);
  out.sort((a, b) => b.p_top5 - a.p_top5);
  return Response.json({ signaux: (sig || []).length, instagram: fol.size, top: out.slice(0, 6).map((o) => ({ id: o.id, p_top5: o.p_top5, p_victoire: o.p_victoire, cote: o.cote })) });
});
