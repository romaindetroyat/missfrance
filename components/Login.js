"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ step: "idle", msg: "" });
  // Code à 6 chiffres reçu par e-mail (marche aussi dans l'app installée, où le lien s'ouvrirait dans Safari)
  const [code6, setCode6] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  async function submitCode(e) {
    e.preventDefault();
    setCodeMsg("Vérification…");
    const mail = email.trim().toLowerCase();
    let { error } = await supabase.auth.verifyOtp({ email: mail, token: code6, type: "email" });
    if (error) ({ error } = await supabase.auth.verifyOtp({ email: mail, token: code6, type: "signup" }));
    if (error) setCodeMsg(/expired|invalid/i.test(error.message) ? "Code incorrect ou expiré. Vérifie le dernier e-mail reçu, ou demande-en un nouveau." : "Connexion impossible : " + error.message);
  }
  // Lien d'invitation (?invite=code) : la personne s'inscrit elle-même avec son prénom et son e-mail
  const [code, setCode] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [name, setName] = useState("");
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
          <strong>E-mail envoyé à {email.trim().toLowerCase()}.</strong>
          <p>Tape le code reçu ci-dessous, ou touche le bouton « Me connecter » de l'e-mail. Pense à vérifier les indésirables.</p>
          <form className="code-form" onSubmit={submitCode}>
            <label htmlFor="code">Code reçu par e-mail</label>
            <input id="code" value={code6} onChange={(e) => setCode6(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={8} />
            <button className="btn primary" disabled={code6.length < 6 || codeMsg === "Vérification…"}>Me connecter</button>
            {codeMsg && <p className={codeMsg === "Vérification…" ? "muted small" : "error"}>{codeMsg}</p>}
          </form>
          <button type="button" className="link" onClick={() => { setState({ step: "idle", msg: "" }); setCode6(""); setCodeMsg(""); }}>Changer d'adresse ou renvoyer un e-mail</button>
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
    </main>
  );
}
