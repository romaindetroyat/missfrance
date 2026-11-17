"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ step: "idle", msg: "" });

  async function submit(e) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    setState({ step: "sending", msg: "" });
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
      {state.step === "sent" ? (
        <div className="notice">
          <strong>Lien envoyé à {email.trim().toLowerCase()}.</strong>
          <p>Ouvre l'e-mail sur cet appareil et clique sur le lien pour entrer. Pense à vérifier les indésirables.</p>
        </div>
      ) : (
        <form onSubmit={submit}>
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
