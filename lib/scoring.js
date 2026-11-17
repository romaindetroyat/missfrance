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
