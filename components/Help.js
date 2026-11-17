"use client";
import { useEffect, useId, useRef, useState } from "react";

// Bouton « ? » à côté d'un titre : ouvre une bulle d'aide (feuille en bas d'écran sur mobile).
// Se ferme au clic ailleurs, avec Échap ou avec « Compris ».
export default function Help({ title, children, label, sheet = false }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span className={`help-wrap${sheet ? " as-sheet" : ""}`} ref={box}>
      <button type="button" className="help-btn" aria-expanded={open} aria-controls={id}
        aria-label={`Aide : ${label || title}`} onClick={() => setOpen((o) => !o)}>?</button>
      {open && (
        <>
          <span className="help-scrim" onClick={() => setOpen(false)} />
          <span className="help-pop" id={id} role="dialog" aria-label={title}>
            <span className="help-grip" />
            <strong>{title}</strong>
            <span className="help-text">{children}</span>
            <button type="button" className="help-ok" onClick={() => setOpen(false)}>Compris</button>
          </span>
        </>
      )}
    </span>
  );
}
