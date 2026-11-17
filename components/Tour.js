"use client";
import { useEffect, useState } from "react";

const KEY = "mf2027-tour-done";
const STEPS = [
  ["Bienvenue !", "Fais défiler les candidates. Touche une photo pour ouvrir sa fiche et toutes ses photos."],
  ["Ajoute tes favorites", "Le bouton + place la candidate dans ton Top 5. Tu peux aussi faire glisser la photo (appui long sur mobile)."],
  ["Choisis le rang", "Miss, 1re, 2e, 3e ou 4e dauphine : remplis les places dans l'ordre que tu veux, et enregistre avant 21 h 10."],
  ["Besoin d'aide ?", "Les petits ? à côté des titres expliquent chaque section. La visite se relance depuis le bouton ? en haut."],
];
export const startTour = () => window.dispatchEvent(new Event("mf-tour"));

// Visite guidée : s'ouvre seule à la première visite, puis à la demande
export default function Tour() {
  const [step, setStep] = useState(-1);
  useEffect(() => {
    let done = true;
    try { done = localStorage.getItem(KEY) === "1"; } catch {}
    const t = done ? null : setTimeout(() => setStep(0), 900);
    const go = () => setStep(0);
    window.addEventListener("mf-tour", go);
    return () => { clearTimeout(t); window.removeEventListener("mf-tour", go); };
  }, []);
  if (step < 0) return null;
  const close = () => { setStep(-1); try { localStorage.setItem(KEY, "1"); } catch {} };
  const [title, text] = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div className="tour" role="dialog" aria-label="Visite guidée" key={step}>
      <div className="tour-head">
        <span className="tour-step">Étape {step + 1} / {STEPS.length}</span>
        <button type="button" className="tour-x" onClick={close} aria-label="Fermer la visite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <strong className="tour-title">{title}</strong>
      <p>{text}</p>
      <div className="tour-foot">
        {STEPS.map((_, i) => <span key={i} className={`tour-dot${i === step ? " on" : ""}`} />)}
        {step > 0 && <button type="button" className="btn tour-back" onClick={() => setStep(step - 1)}>Retour</button>}
        <button type="button" className="btn primary" onClick={() => (last ? close() : setStep(step + 1))}>{last ? "C'est parti" : "Suivant"}</button>
      </div>
    </div>
  );
}
