// Recalcul des probabilités et des cotes à partir du score de base du modèle (model/model.py)
// et des signaux de la saison, aujourd'hui la popularité Instagram :
//  - n° 1 en abonnés : +2,5 ; n° 2 : +0,8 ; n° 3 : +0,4 (classement utilisé seulement si au moins 25 comptes sont relevés) ;
//  - pour toutes : +0,15 × écart standardisé du logarithme des abonnés (borné entre -0,3 et +0,45).
// Un bonus de +0,69 double la force relative d'une candidate. Simulation Plackett-Luce (astuce de Gumbel).
// Les cotes sont figées au verrouillage des pronostics (sauf appel forcé).
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const N_SIM = 60_000;
const RANK_BONUS = [2.5, 0.8, 0.4];
const MIN_FOR_RANK = 25;

Deno.serve(async (req) => {
  const { data: cfg } = await sb.from("collector_config").select("secret").eq("id", 1).single();
  if (!cfg || req.headers.get("x-collect-key") !== cfg.secret) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { data: st } = await sb.from("settings").select("ceremony_at").eq("id", 1).single();
  if (!body.force && st && Date.now() >= new Date(st.ceremony_at).getTime()) {
    return new Response(JSON.stringify({ skipped: "cotes figées depuis le verrouillage" }), { headers: { "Content-Type": "application/json" } });
  }

  const { data: cands } = await sb.from("candidates").select("id,nom,score_base").order("id");
  const { data: ig } = await sb.from("instagram_stats").select("candidate_id,followers");
  const fol = new Map((ig || []).filter((r) => r.followers > 0).map((r) => [r.candidate_id, r.followers as number]));
  const n = cands!.length;
  const bonus = new Array(n).fill(0);
  const notes: string[][] = cands!.map(() => []);

  // Signal continu : logarithme des abonnés, standardisé sur les comptes relevés
  const logs = cands!.map((c) => (fol.has(c.id) ? Math.log(fol.get(c.id)!) : null));
  const known = logs.filter((x): x is number => x !== null);
  if (known.length >= 5) {
    const mu = known.reduce((a, b) => a + b, 0) / known.length;
    const sd = Math.sqrt(known.reduce((a, b) => a + (b - mu) ** 2, 0) / (known.length - 1)) || 1;
    logs.forEach((x, i) => {
      if (x === null) return;
      const b = Math.max(-0.3, Math.min(0.45, 0.15 * ((x - mu) / sd)));
      bonus[i] += b;
      notes[i].push(`Instagram : ${fol.get(cands![i].id)!.toLocaleString("fr-FR")} abonnés (${b >= 0 ? "+" : ""}${b.toFixed(2)})`);
    });
  }
  // Signal de rang : la plus suivie a fini 1re ou 2e lors des 3 éditions documentées
  if (known.length >= MIN_FOR_RANK) {
    const order = cands!.map((c, i) => [fol.get(c.id) ?? -1, i]).sort((a, b) => b[0] - a[0]);
    RANK_BONUS.forEach((b, r) => {
      const i = order[r][1];
      if (order[r][0] <= 0) return;
      bonus[i] += b;
      notes[i].push(`n° ${r + 1} des candidates sur Instagram (+${b.toFixed(1)})`);
    });
  }

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
  for (let i = 0; i < n; i++) {
    const pr = counts[i].map((x) => x / N_SIM);
    const p5 = pr.reduce((a, b) => a + b, 0);
    const cote = Math.round(Math.min(15, Math.max(1.5, 1 / Math.max(p5, 1e-6))) * 10) / 10;
    const row = {
      p_rang: pr.map((x) => Math.round(x * 1e4) / 1e4), p_victoire: Math.round(pr[0] * 1e4) / 1e4, p_top5: Math.round(p5 * 1e4) / 1e4,
      cote, bonus: Math.round(bonus[i] * 1000) / 1000, bonus_note: notes[i].join(" ; ") || null, odds_updated_at: now,
    };
    await sb.from("candidates").update(row).eq("id", cands![i].id);
    out.push({ id: cands![i].id, ...row });
  }
  out.sort((a, b) => b.p_top5 - a.p_top5);
  return new Response(JSON.stringify({ instagram_releves: known.length, top: out.slice(0, 6) }), { headers: { "Content-Type": "application/json" } });
});
