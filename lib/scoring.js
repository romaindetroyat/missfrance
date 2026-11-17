// Barème : présence dans le Top 5 réel = 10 × cote ; rang exact = ×2 ; gagnante trouvée à la 1re place = ×3.
export function scorePick(candidateId, predictedRank, results, cote) {
  const realRank = results.indexOf(candidateId);
  if (realRank === -1) return { points: 0, status: "absente" };
  const base = 10 * (Number(cote) || 1);
  if (realRank !== predictedRank) return { points: Math.round(base), status: "presente" };
  if (realRank === 0) return { points: Math.round(base * 3), status: "gagnante" };
  return { points: Math.round(base * 2), status: "exact" };
}

export function scorePrediction(picks, results, coteById) {
  const detail = picks.map((id, i) => ({ id, ...scorePick(id, i, results, coteById[id]) }));
  return { total: detail.reduce((s, d) => s + d.points, 0), detail };
}

export const RANKS = ["Miss France 2027", "1re dauphine", "2e dauphine", "3e dauphine", "4e dauphine"];

// Poids des deux phases : Top 5 principal (verrouillé au début de la cérémonie) et ajustements de dernière minute.
export const WEIGHT_MAIN = 0.8;
export const WEIGHT_ADJUST = 0.2;

// Score final : 80 % du Top 5 principal + 20 % des ajustements.
// Sans ajustement enregistré, le Top 5 principal compte aussi pour la part « ajustements ».
export function scoreFinal(mainPicks, adjustPicks, results, coteById) {
  const main = mainPicks ? scorePrediction(mainPicks, results, coteById) : null;
  const adjust = adjustPicks ? scorePrediction(adjustPicks, results, coteById) : main;
  const total = Math.round(WEIGHT_MAIN * (main?.total || 0) + WEIGHT_ADJUST * (adjust?.total || 0));
  return { total, main, adjust, adjusted: !!adjustPicks };
}
