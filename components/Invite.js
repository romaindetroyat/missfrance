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
  // Chaque envoi est compté (avec le numéro s'il est saisi), pour le suivi des invitations par l'admin
  const log = (channel) => { supabase.rpc("log_invite", { p_channel: channel, p_phone: n.length >= 8 ? "+" + n : null }).then(() => {}); };
  const whatsapp = (e) => {
    e.preventDefault();
    log("whatsapp");
    window.open(`https://wa.me/${n.length >= 8 ? n : ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const sms = () => { log("sms"); window.location.href = `sms:${n.length >= 8 ? "+" + n : ""}?&body=${encodeURIComponent(text)}`; };
  // Menu de partage du téléphone (iPhone / Android) : WhatsApp, Messages, Mail… ; dans WhatsApp, on peut cocher plusieurs discussions
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const share = async () => {
    try { await navigator.share({ title: "Miss France 2027 entre amis", text }); log("partage"); }
    catch (e) { if (e?.name !== "AbortError") copy(); }
  };
  const copy = async () => { log("copie"); try { await navigator.clipboard.writeText(text); toast("Message copié : colle-le où tu veux."); } catch { prompt("Copie ce message :", text); } };
  return (
    <section className="invite block">
      <h2>Inviter un ami</h2>
      <p className="muted small">Envoie-lui ton lien d'invitation : il s'inscrit lui-même avec son prénom et son e-mail. Sans numéro, tu choisis le contact ou un groupe dans WhatsApp.</p>
      <form className="invite-form" onSubmit={whatsapp}>
        <label>
          <span>Son numéro (facultatif)</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" placeholder="06 12 34 56 78" />
        </label>
        {canShare && <button type="button" className="btn primary" onClick={share}>Partager à plusieurs…</button>}
        <button className={`btn${canShare ? "" : " primary"}`}>Envoyer sur WhatsApp</button>
        <button type="button" className="btn" onClick={sms}>Par SMS</button>
        <button type="button" className="btn" onClick={copy}>Copier le message</button>
      </form>
      <details className="invite-tips">
        <summary>Inviter beaucoup de monde d'un coup</summary>
        <ul className="muted small">
          <li><strong>Plusieurs discussions :</strong> touche « Partager à plusieurs… » ou « Envoyer sur WhatsApp » sans numéro, puis coche plusieurs contacts ou groupes dans WhatsApp (jusqu'à 5 à la fois ; recommence pour les suivants).</li>
          <li><strong>Un groupe WhatsApp :</strong> envoie le message dans le groupe de tes amis, chacun s'inscrit avec le même lien.</li>
          <li><strong>Liste de diffusion WhatsApp :</strong> dans WhatsApp, menu des discussions › Nouvelle diffusion, choisis tes contacts (jusqu'à 256), puis colle le message (« Copier le message » ci-dessus). Chacun le reçoit en privé ; seuls ceux qui ont ton numéro enregistré le reçoivent.</li>
        </ul>
      </details>
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

// Suivi des invitations pour l'admin (page Suivi) : envois WhatsApp / SMS, inscriptions par lien, ajouts par e-mail
export function InvitesLog() {
  const app = useApp();
  const [sends, setSends] = useState(null);
  const admin = !!app.me?.is_admin;
  useEffect(() => { if (admin) supabase.rpc("invite_sends_admin").then(({ data }) => setSends(data || [])); }, [admin]);
  if (!admin) return null;
  const by = (ch) => (sends || []).filter((x) => x.channel === ch).length;
  const phones = new Set((sends || []).filter((x) => x.phone).map((x) => x.phone)).size;
  const when = (d) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const CH = { partage: "Partage (menu du téléphone)", whatsapp: "Invitation WhatsApp", sms: "Invitation SMS", copie: "Message copié", lien: "Inscrit par lien", email: "Ajouté par e-mail" };
  return (
    <section className="block">
      <h2>Invitations <span className="muted small">({sends ? sends.length : "…"})</span></h2>
      {sends && (
        <p className="muted small">
          {by("partage")} partage{by("partage") > 1 ? "s" : ""} groupé{by("partage") > 1 ? "s" : ""} · {by("whatsapp")} par WhatsApp · {by("sms")} par SMS · {by("copie")} message{by("copie") > 1 ? "s" : ""} copié{by("copie") > 1 ? "s" : ""}
          {phones ? ` (${phones} numéro${phones > 1 ? "s" : ""} différent${phones > 1 ? "s" : ""})` : ""}
          {" "}· {by("lien")} inscrit{by("lien") > 1 ? "s" : ""} par lien · {by("email")} ajouté{by("email") > 1 ? "s" : ""} par e-mail.
          Les envois WhatsApp sont comptés depuis le 18 novembre au soir ; ceux d'avant n'apparaissent qu'à travers les inscriptions par lien.
        </p>
      )}
      {sends?.length > 0 && (
        <div className="list">
          {sends.slice(0, 50).map((x, i) => (
            <div key={i} className="row">
              <span className="row-main">
                <span className="name">{CH[x.channel] || x.channel}{x.invitee ? ` : ${x.invitee}` : ""}{x.phone ? ` · ${x.phone}` : ""}</span>
                <span className="meta">par {x.sender_name} · {when(x.created_at)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
