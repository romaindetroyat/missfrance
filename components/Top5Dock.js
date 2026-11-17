"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";
import { portraitOf } from "@/components/Bits";
import Top5Panel from "@/components/Top5Panel";
import { useTop5 } from "@/lib/top5";

// Barre « Mon Top 5 » fixée en bas sur mobile ; ouvre une feuille pour réordonner et enregistrer.
export default function Top5Dock() {
  const app = useApp();
  const t = useTop5();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const label = t.phase === "adjust" ? "Mes ajustements" : "Mon Top 5";
  return (
    <>
      <button className={`dock${t.dirty ? " dirty" : ""}`} onClick={() => setOpen(true)} aria-label={`Ouvrir ${label}`}>
        <span className="dock-text">
          <strong>{label}</strong>
          <span>{!t.editable ? "Verrouillé" : t.dirty ? "À enregistrer" : t.full ? "Complet ✓" : `${t.picks.length}/5 choisies`}</span>
        </span>
        <span className="dock-slots">
          {[0, 1, 2, 3, 4].map((i) => {
            const c = app.byId[t.picks[i]];
            const src = c && portraitOf(app, c);
            return c ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span key={c.id} className="slot filled pop">{src ? <img src={src} alt="" /> : c.nom[0]}</span>
            ) : (
              <span key={`e${i}`} className="slot">{i + 1}</span>
            );
          })}
        </span>
      </button>
      {open && (
        <div className="sheet-wrap" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
            <div className="grab" aria-hidden />
            <button className="link sheet-close" onClick={() => setOpen(false)}>Fermer</button>
            <Top5Panel t={t} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
