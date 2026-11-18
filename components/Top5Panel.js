"use client";
import Link from "next/link";
import { useApp } from "@/app/providers";
import { Thumb } from "@/components/Bits";
import { RANKS } from "@/lib/scoring";
import { useDrag } from "@/components/Drag";
import Help from "@/components/Help";
import { PhotoButton } from "./PhotoViewer";

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
        <h2>{title}
          {t.phase === "adjust" ? (
            <Help title="Ajustements de dernière minute" label="les ajustements">De 21 h 10 à 22 h 30, pendant l'émission, enregistre un Top 5 ajusté d'après ce que tu vois à l'écran. Il compte pour 20 % du score final ; ton Top 5 principal compte pour 80 %.</Help>
          ) : (
            <Help title="Mon Top 5" label="remplir mon Top 5">Remplis les places dans l'ordre que tu veux : tu peux choisir ta 3e dauphine avant ta Miss. Glisse une ligne par sa poignée pour changer l'ordre, ou utilise les flèches. Ton brouillon est gardé sur cet appareil ; pense à enregistrer avant 21 h 10 le soir de l'élection.</Help>
          )}
        </h2>
        <span className="muted small">{t.full ? "Complet ✓" : `${t.count}/5`}</span>
      </div>
      {t.phase === "adjust" && <p className="small muted">Pendant la cérémonie : compte pour 20 % du score.</p>}
      <ol className="t5-list">
        {RANKS.map((label, i) => {
          const id = t.picks[i];
          const c = id && app.byId[id];
          return c ? (
            <li key={id} className={`t5-row in${over(i) ? " over" : ""}${dnd?.drag?.id === id ? " lifted" : ""}`} data-slot={i}>
              {t.editable && (
                <span className="grip" {...dnd.handle(c.id, { immediate: true })} aria-label={`Glisser ${c.nom} pour changer son rang`} role="img" data-tip="Glisse pour changer le rang">
                  <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true"><circle cx="4" cy="3" r="1.6"/><circle cx="10" cy="3" r="1.6"/><circle cx="4" cy="9" r="1.6"/><circle cx="10" cy="9" r="1.6"/><circle cx="4" cy="15" r="1.6"/><circle cx="10" cy="15" r="1.6"/></svg>
                </span>
              )}
              <span className="rank solid">{i + 1}</span>
              <PhotoButton c={c}><Thumb c={c} /></PhotoButton>
              <Link href={`/candidate/${c.id}`} className="t5-who" onClick={onNavigate}>
                <span>
                  <span className="region">{SHORT[i]}</span>
                  <span className="name">{c.nom}</span>
                </span>
              </Link>
              {t.editable && (
                <span className="t5-actions">
                  <button className="icon" disabled={i === 0} onClick={() => t.move(i, -1)} aria-label={`Monter ${c.nom}`} data-tip="Monter"><Icon d="M6 15l6-6 6 6" /></button>
                  <button className="icon" disabled={i === 4} onClick={() => t.move(i, 1)} aria-label={`Descendre ${c.nom}`} data-tip="Descendre"><Icon d="M6 9l6 6 6-6" /></button>
                  <button className="icon" onClick={() => t.clearSlot(i)} aria-label={`Retirer ${c.nom}`} data-tip="Retirer"><Icon d="M6 6l12 12M18 6L6 18" /></button>
                </span>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className={`t5-row empty${over(i) ? " over" : ""}`} data-slot={i}>
              <span className="rank dashed">{i + 1}</span>
              <span className="t5-empty">
                <span className="muted small">{label}{dnd?.drag ? " — dépose ici" : ""}</span>
                {t.editable && !dnd?.drag && (
                  <select value="" onChange={(e) => e.target.value && t.placeAt(e.target.value, i)} aria-label={`Choisir ma ${label}`}>
                    <option value="">Choisir…</option>
                    {[...app.candidates].sort((a, b) => a.region.localeCompare(b.region, "fr")).map((c) => (
                      <option key={c.id} value={c.id}>{t.picks.includes(c.id) ? "↺ " : ""}{c.region} — {c.nom}</option>
                    ))}
                  </select>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {t.editable ? (
        <button className="btn primary block" disabled={!t.full || !t.dirty || t.saving} onClick={t.save}>
          {t.saving ? "Enregistrement…" : !t.full ? `Encore ${5 - t.count} place${5 - t.count > 1 ? "s" : ""} à remplir` : t.dirty ? (t.hasSaved ? "Enregistrer les modifications" : "Enregistrer") : "Enregistré ✓"}
        </button>
      ) : (
        <p className="small muted">Pronostics verrouillés.</p>
      )}
      {t.dirty && t.full && <p className="small warn">Modifications non enregistrées.</p>}
    </div>
  );
}
