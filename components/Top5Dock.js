"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";
import { portraitOf } from "@/components/Bits";
import Top5Panel from "@/components/Top5Panel";
import { useTop5 } from "@/lib/top5";
import { useDrag } from "@/components/Drag";
import { sized, onImgError } from "@/lib/img";

// Barre « Mon Top 5 » fixée en bas sur mobile ; ouvre une feuille pour réordonner et enregistrer.
export default function Top5Dock() {
  const app = useApp();
  const t = useTop5();
  const [open, setOpen] = useState(false);
  const dnd = useDrag();
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
      <button data-drop="top5" className={`dock${t.dirty ? " dirty" : ""}${dnd?.drag ? " drop-ready" : ""}`} onClick={() => setOpen(true)} aria-label={`Ouvrir ${label}`}>
        <span className="dock-text">
          <strong>{label}</strong>
          <span>{!t.editable ? "Verrouillé" : t.dirty ? "À enregistrer" : t.full ? "Complet ✓" : `${t.count}/5 choisies`}</span>
        </span>
        <span className="dock-slots">
          {[0, 1, 2, 3, 4].map((i) => {
            const c = app.byId[t.picks[i]];
            const src = c && portraitOf(app, c);
            return c ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span key={c.id} data-slot={i} className={`slot filled pop${dnd?.drag?.slot === i ? " over" : ""}`}>{src ? <img src={sized(src, 120)} onError={onImgError(src)} alt="" /> : c.nom[0]}</span>
            ) : (
              <span key={`e${i}`} data-slot={i} className={`slot${dnd?.drag?.slot === i ? " over" : ""}`}>{i + 1}</span>
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
