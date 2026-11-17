"use client";
import Link from "next/link";
import { useApp } from "@/app/providers";
import { Thumb } from "@/components/Bits";
import { RANKS } from "@/lib/scoring";
import { useDrag } from "@/components/Drag";

const SHORT = ["Miss France", "1re dauphine", "2e dauphine", "3e dauphine", "4e dauphine"];
const Icon = ({ d }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
);

// Liste ordonnable du Top 5 + bouton d'enregistrement. Utilisée dans le panneau latéral et la feuille mobile.
export default function Top5Panel({ t, onNavigate }) {
  const app = useApp();
  const dnd = useDrag();
  const over = (i) => dnd?.drag && dnd.drag.slot === i;
  const title = t.phase === "adjust" ? "Mes ajustements" : "Mon Top 5";
  return (
    <div className={`t5${dnd?.drag ? " drop-ready" : ""}`} data-drop="top5">
      <div className="t5-head">
        <h2>{title}</h2>
        <span className="muted small">{t.full ? "Complet ✓" : `${t.picks.length}/5`}</span>
      </div>
      {t.phase === "adjust" && <p className="small muted">Pendant la cérémonie : compte pour 20 % du score.</p>}
      <ol className="t5-list">
        {RANKS.map((label, i) => {
          const id = t.picks[i];
          const c = id && app.byId[id];
          return c ? (
            <li key={id} className={`t5-row in${over(i) ? " over" : ""}${dnd?.drag?.id === id ? " lifted" : ""}`} data-slot={i}>
              {t.editable && (
                <span className="grip" {...dnd.handle(c.id, { immediate: true })} aria-label={`Glisser ${c.nom} pour changer son rang`} role="img">
                  <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true"><circle cx="4" cy="3" r="1.6"/><circle cx="10" cy="3" r="1.6"/><circle cx="4" cy="9" r="1.6"/><circle cx="10" cy="9" r="1.6"/><circle cx="4" cy="15" r="1.6"/><circle cx="10" cy="15" r="1.6"/></svg>
                </span>
              )}
              <span className="rank solid">{i + 1}</span>
              <Link href={`/candidate/${c.id}`} className="t5-who" onClick={onNavigate}>
                <Thumb c={c} />
                <span>
                  <span className="region">{SHORT[i]}</span>
                  <span className="name">{c.nom}</span>
                </span>
              </Link>
              {t.editable && (
                <span className="t5-actions">
                  <button className="icon" disabled={i === 0} onClick={() => t.move(i, -1)} aria-label={`Monter ${c.nom}`}><Icon d="M6 15l6-6 6 6" /></button>
                  <button className="icon" disabled={i === t.picks.length - 1} onClick={() => t.move(i, 1)} aria-label={`Descendre ${c.nom}`}><Icon d="M6 9l6 6 6-6" /></button>
                  <button className="icon" onClick={() => t.toggle(c.id)} aria-label={`Retirer ${c.nom}`}><Icon d="M6 6l12 12M18 6L6 18" /></button>
                </span>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className={`t5-row empty${over(i) ? " over" : ""}`} data-slot={i}>
              <span className="rank dashed">{i + 1}</span>
              <span className="muted small">{label}{t.editable && i === t.picks.length ? (dnd?.drag ? " — dépose ici" : " — « + » ou glisse une photo ici") : ""}</span>
            </li>
          );
        })}
      </ol>
      {t.editable ? (
        <button className="btn primary block" disabled={!t.full || !t.dirty || t.saving} onClick={t.save}>
          {t.saving ? "Enregistrement…" : !t.full ? `Encore ${5 - t.picks.length} à choisir` : t.dirty ? (t.hasSaved ? "Enregistrer les modifications" : "Enregistrer") : "Enregistré ✓"}
        </button>
      ) : (
        <p className="small muted">Pronostics verrouillés.</p>
      )}
      {t.dirty && t.full && <p className="small warn">Modifications non enregistrées.</p>}
    </div>
  );
}
