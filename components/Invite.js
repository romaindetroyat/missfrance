"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";
import { supabase } from "@/lib/supabase";
import { useToast } from "./Toast";

// Invitation d'un ami : n'importe quel joueur ajoute un prénom + e-mail à la liste des invités,
// puis lui envoie le lien du site (WhatsApp ou menu de partage du téléphone).
export default function Invite() {
  const app = useApp();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { name, email }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("invite_player", { p_name: name, p_email: email });
    setBusy(false);
    if (error) return toast("L'invitation n'a pas pu être enregistrée.");
    if (data === "ok" || data === "deja") {
      setDone({ name: name.trim(), email: email.trim().toLowerCase(), already: data === "deja" });
      setName(""); setEmail("");
      if (data === "ok") app.reload();
    } else {
      toast(data);
    }
  };

  const message = (d) => `${d.name}, viens faire ton pronostic Miss France 2027 avec nous ! 👑 Connecte-toi avec ton adresse ${d.email} : ${window.location.origin}\n\nTu recevras un e-mail de connexion en anglais (« Magic Link », expéditeur Supabase) : clique sur « Log In ». Pense à regarder dans tes indésirables.`;
  const share = async (d) => {
    if (navigator.share) {
      try { await navigator.share({ title: "Miss France 2027 — Pronostics", text: message(d) }); return; } catch (err) { if (err?.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message(d))}`, "_blank", "noopener");
  };

  return (
    <section className="invite block">
      <h2>Inviter un ami</h2>
      {done ? (
        <div className="invite-done">
          <p>
            {done.already ? <><strong>{done.email}</strong> était déjà invité.</> : <><strong>{done.name}</strong> peut maintenant se connecter avec <strong>{done.email}</strong>.</>}
            {" "}Envoie-lui le lien :
          </p>
          <div className="invite-actions">
            <button type="button" className="btn primary" onClick={() => share(done)}>Envoyer le lien</button>
            <button type="button" className="btn" onClick={() => setDone(null)}>Inviter quelqu'un d'autre</button>
          </div>
        </div>
      ) : (
        <form className="invite-form" onSubmit={submit}>
          <label>
            <span>Prénom</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="off" placeholder="Camille" />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" inputMode="email" placeholder="camille@exemple.fr" />
          </label>
          <button className="btn primary" disabled={busy}>{busy ? "Ajout…" : "Inviter"}</button>
        </form>
      )}
      <p className="muted small">La personne se connecte ensuite avec cette adresse : elle reçoit un lien de connexion par e-mail, en anglais (« Magic Link »).</p>
      <InviteLink />
    </section>
  );
}

// Lien d'invitation personnel, pour les amis dont on n'a que le numéro : ils s'inscrivent eux-mêmes
// avec leur prénom et leur e-mail. Envoi direct sur WhatsApp si on saisit leur numéro.
const waNumber = (raw) => {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 10 && d.startsWith("0")) d = "33" + d.slice(1); // numéro français
  return d;
};
function InviteLink() {
  const [code, setCode] = useState(null);
  const [phone, setPhone] = useState("");
  useEffect(() => { supabase.rpc("my_invite_code").then(({ data }) => setCode(data || null)); }, []);
  if (!code) return null;
  const link = `${window.location.origin}/?invite=${code}`;
  const text = `Viens faire ton pronostic Miss France 2027 avec nous ! 👑 Ouvre ce lien, entre ton prénom et ton e-mail : ${link}\n\nTu recevras ensuite un e-mail de connexion en anglais (« Magic Link », expéditeur Supabase) : clique sur « Log In ». Pense à regarder dans tes indésirables.`;
  const send = (e) => {
    e.preventDefault();
    const n = waNumber(phone);
    window.open(`https://wa.me/${n.length >= 8 ? n : ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); alert("Message copié."); } catch { prompt("Copie ce message :", text); } };
  return (
    <div className="invite-link">
      <h3 className="sub">Tu n'as que son numéro ?</h3>
      <p className="muted small">Envoie-lui ton lien d'invitation : il s'inscrit lui-même avec son prénom et son e-mail.</p>
      <form className="invite-form" onSubmit={send}>
        <label>
          <span>Numéro WhatsApp (facultatif)</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" placeholder="06 12 34 56 78" />
        </label>
        <button className="btn primary">Envoyer sur WhatsApp</button>
        <button type="button" className="btn" onClick={copy}>Copier le message</button>
      </form>
    </div>
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
