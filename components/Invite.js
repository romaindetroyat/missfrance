"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/app/providers";
import { supabase } from "@/lib/supabase";
import { useToast } from "./Toast";

// Invitation d'un ami : chaque joueur a son lien personnel ; il l'envoie par WhatsApp ou SMS au numéro de l'ami
// (ou dans un groupe), et l'ami s'inscrit lui-même avec son prénom et son e-mail.
const waNumber = (raw) => {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 10 && d.startsWith("0")) d = "33" + d.slice(1); // numéro français
  return d;
};

export default function Invite() {
  const toast = useToast();
  const [code, setCode] = useState(null);
  const [phone, setPhone] = useState("");
  useEffect(() => { supabase.rpc("my_invite_code").then(({ data }) => setCode(data || null)); }, []);
  if (!code) return null;
  const link = `${window.location.origin}/?invite=${code}`;
  const text = `Viens faire ton pronostic Miss France 2027 avec nous ! 👑 Ouvre ce lien, entre ton prénom et ton e-mail : ${link}\n\nTu recevras ensuite un e-mail avec un code à 6 chiffres à taper sur le site (pense à regarder dans tes indésirables).`;
  const n = waNumber(phone);
  const whatsapp = (e) => {
    e.preventDefault();
    window.open(`https://wa.me/${n.length >= 8 ? n : ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const sms = () => { window.location.href = `sms:${n.length >= 8 ? "+" + n : ""}?&body=${encodeURIComponent(text)}`; };
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast("Message copié : colle-le où tu veux."); } catch { prompt("Copie ce message :", text); } };
  return (
    <section className="invite block">
      <h2>Inviter un ami</h2>
      <p className="muted small">Envoie-lui ton lien d'invitation : il s'inscrit lui-même avec son prénom et son e-mail. Sans numéro, tu choisis le contact ou un groupe dans WhatsApp.</p>
      <form className="invite-form" onSubmit={whatsapp}>
        <label>
          <span>Son numéro (facultatif)</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" placeholder="06 12 34 56 78" />
        </label>
        <button className="btn primary">Envoyer sur WhatsApp</button>
        <button type="button" className="btn" onClick={sms}>Par SMS</button>
        <button type="button" className="btn" onClick={copy}>Copier le message</button>
      </form>
    </section>
  );
}

// Bouton « Inviter » de l'en-tête, visible partout : ouvre le formulaire d'invitation dans une fenêtre
export function InviteButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <button type="button" className="tour-btn invite-btn" onClick={() => setOpen(true)} aria-label="Inviter des amis à jouer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6" /></svg>
        <span>Inviter</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="invite-modal" role="dialog" aria-modal="true" aria-label="Inviter des amis" onClick={() => setOpen(false)}>
          <div className="invite-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="invite-x" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            <Invite />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Liste des joueurs pour l'admin : qui a invité qui, et retrait
export function PlayersAdmin() {
  const app = useApp();
  if (!app.me?.is_admin) return null;
  const nameOf = Object.fromEntries(app.players.map((p) => [p.email, p.display_name]));
  const remove = async (p) => {
    if (!confirm(`Retirer ${p.display_name} (${p.email}) ? Son Top 5 sera supprimé.`)) return;
    const { data, error } = await supabase.rpc("remove_player", { p_email: p.email });
    if (error || data !== "ok") return alert(error?.message || data);
    app.reload();
  };
  const list = [...app.players].sort((a, b) => a.display_name.localeCompare(b.display_name, "fr"));
  return (
    <section className="block">
      <h2>Liste des invités <span className="muted small">({list.length}, visible par toi seul)</span></h2>
      <div className="list">
        {list.map((p) => (
          <div key={p.email} className="row">
            <span className="row-main">
              <span className="name">{p.display_name}</span>
              <span className="meta">{p.email}{p.invited_by ? ` · invité par ${nameOf[p.invited_by] || p.invited_by}` : ""}</span>
            </span>
            {!p.is_admin && <button type="button" className="btn" onClick={() => remove(p)}>Retirer</button>}
          </div>
        ))}
      </div>
    </section>
  );
}
