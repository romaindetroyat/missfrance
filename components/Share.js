"use client";

const TEXT = "Viens faire ton pronostic Miss France 2027 avec nous ! 👑";
// Partage du site : menu de partage du téléphone si disponible, sinon WhatsApp
export default function Share({ className = "link" }) {
  const share = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title: "Miss France 2027 — Pronostics", text: TEXT, url }); return; } catch (e) { if (e?.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${TEXT} ${url}`)}`, "_blank", "noopener");
  };
  return (
    <button type="button" className={className} onClick={share} data-tip="Envoyer le lien sur WhatsApp" data-tip-side="bottom">
      Partager
    </button>
  );
}
