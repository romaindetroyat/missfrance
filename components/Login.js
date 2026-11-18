"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ step: "idle", msg: "" });
  // Lien d'invitation (?invite=code) : la personne s'inscrit elle-même avec son prénom et son e-mail
  const [code, setCode] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [name, setName] = useState("");
  // App installée (écran d'accueil) : le lien de l'e-mail s'ouvre dans Safari, pas dans l'app.
  // On permet donc de coller ce lien ici pour se connecter dans l'app.
  const [standalone, setStandalone] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteMsg, setPasteMsg] = useState("");
  useEffect(() => {
    setStandalone(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
  }, []);
  async function connectWithPastedLink(e) {
    e.preventDefault();
    setPasteMsg("");
    let url;
    try { url = new URL(pasted.trim()); } catch { return setPasteMsg("Ce n'est pas un lien. Copie le lien du bouton « Log In » de l'e-mail."); }
    const token_hash = url.searchParams.get("token") || url.searchParams.get("token_hash");
    const t = url.searchParams.get("type");
    if (!token_hash) return setPasteMsg("Ce lien ne contient pas de clé de connexion. Copie bien le lien du bouton « Log In ».");
    const type = t === "signup" ? "signup" : t === "magiclink" ? "magiclink" : "email";
    setPasteMsg("Connexion…");
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) setPasteMsg(/expired|invalid/i.test(error.message) ? "Ce lien a expiré ou a déjà servi. Demande un nouveau lien ci-dessus." : "Connexion impossible : " + error.message);
  }
  useEffect(() => {
    let c = new URLSearchParams(window.location.search).get("invite");
    try { if (c) sessionStorage.setItem("mf-invite", c); else c = sessionStorage.getItem("mf-invite"); } catch {}
    if (!c) return;
    setCode(c);
    supabase.rpc("invite_from", { p_code: c }).then(({ data }) => setInviter(data || ""));
  }, []);

  async function submit(e) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    setState({ step: "sending", msg: "" });
    if (code && inviter) {
      const { data: joined, error: ej } = await supabase.rpc("join_with_code", { p_code: code, p_name: name, p_email: clean });
      if (ej) return setState({ step: "idle", msg: "Inscription impossible pour le moment. Réessaie dans un instant." });
      if (joined !== "ok") return setState({ step: "idle", msg: joined });
    }
    const { data: invited, error: e1 } = await supabase.rpc("is_invited", { p_email: clean });
    if (e1) return setState({ step: "idle", msg: "Connexion impossible pour le moment. Réessaie dans un instant." });
    if (!invited)
      return setState({ step: "idle", msg: "Cette adresse n'est pas sur la liste des invités. Utilise celle qui a reçu l'invitation." });
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error)
      return setState({
        step: "idle",
        msg: /rate|limit/i.test(error.message)
          ? "Trop de demandes de connexion en peu de temps. Réessaie dans quelques minutes."
          : "L'e-mail n'a pas pu être envoyé. Réessaie dans un instant.",
      });
    setState({ step: "sent", msg: "" });
  }

  return (
    <main className="login">
      <p className="eyebrow">12 décembre 2026</p>
      <h1>Miss France 2027</h1>
      <p className="lead">Les pronostics entre amis. Compose ton Top 5, dans l'ordre.</p>
      {code && inviter && state.step !== "sent" && (
        <p className="notice"><strong>{inviter} t'invite à jouer !</strong> Indique ton prénom et ton adresse e-mail : tu recevras ton lien de connexion.</p>
      )}
      {code && inviter === "" && <p className="error">Ce lien d'invitation n'est plus valable. Demande un nouveau lien à ton ami.</p>}
      {state.step === "sent" ? (
        <div className="notice">
          <strong>Lien envoyé à {email.trim().toLowerCase()}.</strong>
          <p>Ouvre l'e-mail sur cet appareil et clique sur le lien pour entrer. Il arrive en anglais (« Magic Link », envoyé par Supabase) : clique sur « Log In ». Pense à vérifier les indésirables.</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          {code && inviter && (
            <>
              <label htmlFor="name">Ton prénom</label>
              <input id="name" required maxLength={40} autoComplete="given-name" placeholder="Camille" value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <label htmlFor="email">Ton adresse e-mail</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="prenom@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn primary" disabled={state.step === "sending"}>
            {state.step === "sending" ? "Envoi…" : "Recevoir mon lien de connexion"}
          </button>
          {state.msg && <p className="error">{state.msg}</p>}
        </form>
      )}
      {standalone && (
        <form className="paste-link" onSubmit={connectWithPastedLink}>
          <strong>Tu utilises l'app installée sur l'écran d'accueil ?</strong>
          <p className="muted small">Le lien de l'e-mail s'ouvre dans Safari, pas dans l'app. Dans l'e-mail, <strong>appuie longuement sur « Log In »</strong>, choisis <strong>« Copier le lien »</strong>, puis colle-le ici :</p>
          <input value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="https://…supabase.co/auth/v1/verify?token=…" autoComplete="off" inputMode="url" />
          <button className="btn primary" disabled={!pasted.trim()}>Me connecter dans l'app</button>
          {pasteMsg && <p className={pasteMsg === "Connexion…" ? "muted small" : "error"}>{pasteMsg}</p>}
        </form>
      )}
    </main>
  );
}
