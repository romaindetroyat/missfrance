"use client";
import { useApp } from "@/app/providers";

// Choix direct du rang d'une candidate (1 = Miss France … 5 = 4e dauphine), sans ordre imposé.
const SHORT = ["Miss", "1re", "2e", "3e", "4e"];
export default function RankPicker({ t, id, dark = false }) {
  const app = useApp();
  if (!t.editable) return null;
  const mine = t.picks.indexOf(id);
  return (
    <div className={`rankpick${dark ? " dark" : ""}`} role="group" aria-label="Choisir son rang dans mon Top 5">
      {SHORT.map((label, i) => {
        const occ = t.picks[i];
        const other = occ && occ !== id ? app.byId[occ] : null;
        return (
          <button key={i} className={`${mine === i ? "on" : ""}${other ? " taken" : ""}`}
            onClick={() => (mine === i ? t.clearSlot(i) : t.placeAt(id, i))}
            aria-pressed={mine === i}
            data-tip={mine === i ? "Retirer de ce rang" : other ? `Remplacer ${other.nom}` : `Placer en ${t.RANK_NAMES[i]}`}>
            <span className="rp-n">{label}</span>
            <span className="rp-who">{mine === i ? "✓" : other ? other.nom.split(" ")[0] : "libre"}</span>
          </button>
        );
      })}
    </div>
  );
}
