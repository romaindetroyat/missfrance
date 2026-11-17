"use client";
import { useState } from "react";
import { useApp } from "../providers";
import { RANKS } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const app = useApp();
  const [picks, setPicks] = useState(app.results || ["", "", "", "", ""]);
  const [msg, setMsg] = useState("");

  if (!app.me?.is_admin) return <p>Page réservée à l'organisateur.</p>;

  const valid = picks.every(Boolean) && new Set(picks).size === 5;

  async function save(results) {
    setMsg("");
    const { error } = await supabase
      .from("settings")
      .update({ results, results_at: results ? new Date().toISOString() : null })
      .eq("id", 1);
    if (error) return setMsg("L'enregistrement a échoué. Réessaie.");
    await app.reload();
    setMsg(results ? "Résultats publiés : le classement est visible par tous." : "Résultats retirés.");
  }

  return (
    <>
      <h1>Résultats officiels</h1>
      <p className="muted">À saisir après la cérémonie. Les scores de tous les joueurs se calculent aussitôt.</p>
      <div className="list">
        {RANKS.map((label, i) => (
          <div key={i} className="row">
            <span className="rank">{i + 1}</span>
            <select value={picks[i]} aria-label={label}
              onChange={(e) => setPicks(picks.map((p, j) => (j === i ? e.target.value : p)))}>
              <option value="">{label}…</option>
              {app.candidates.map((c) => (
                <option key={c.id} value={c.id} disabled={picks.includes(c.id) && picks[i] !== c.id}>
                  {c.region} — {c.nom}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="savebar">
        <button className="btn primary" disabled={!valid} onClick={() => save(picks)}>Publier les résultats</button>
        {app.results && <button className="btn" onClick={() => save(null)}>Retirer les résultats</button>}
        <span className="muted">{msg}</span>
      </div>
    </>
  );
}
