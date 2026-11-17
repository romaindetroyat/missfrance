"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "../providers";
import { CandidateRow, cote } from "@/components/Bits";
import { useDraft } from "@/lib/draft";
import { RANKS, scorePrediction } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

export default function Prono() {
  const app = useApp();
  const { picks, update, clear, dirty } = useDraft(app.email, app.myPrediction);
  const [state, setState] = useState({ saving: false, msg: "", ok: false });
  const [add, setAdd] = useState("");

  if (app.locked) {
    const saved = app.myPrediction?.picks;
    const coteById = Object.fromEntries(app.candidates.map((c) => [c.id, c.cote]));
    const score = saved && app.results ? scorePrediction(saved, app.results, coteById) : null;
    return (
      <>
        <h1>Mon Top 5</h1>
        <p className="muted">Les pronostics sont verrouillés.</p>
        {saved ? (
          <div className="list">
            {saved.map((id, i) => (
              <CandidateRow key={id} id={id} rank={i + 1}
                right={score ? <span className="pts">{score.detail[i].points} pts</span> : <span className="meta">Cote {cote(app.byId[id])}</span>} />
            ))}
          </div>
        ) : (
          <p>Tu n'as pas enregistré de pronostic.</p>
        )}
        {score && <p className="total">Total : {score.total} points. <Link href="/joueurs">Voir le classement</Link></p>}
      </>
    );
  }

  const move = (i, d) => {
    const next = [...picks];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    update(next);
  };

  async function save() {
    setState({ saving: true, msg: "", ok: false });
    const { error } = await supabase.from("predictions").upsert({ email: app.email, picks });
    if (error) return setState({ saving: false, msg: "L'enregistrement a échoué. Ton brouillon est conservé, réessaie.", ok: false });
    await app.reload();
    clear();
    setState({ saving: false, msg: "Top 5 enregistré. Tu peux le modifier jusqu'au verrouillage.", ok: true });
  }

  const others = app.candidates.filter((c) => !picks.includes(c.id));

  return (
    <>
      <h1>Mon Top 5</h1>
      <p className="muted">
        Dans l'ordre : la n° 1 est ta Miss France 2027. Modifiable jusqu'à 2 heures avant la cérémonie
        {app.lockAt ? ` (${new Date(app.lockAt).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })})` : ""}.
      </p>

      <div className="list">
        {RANKS.map((label, i) =>
          picks[i] ? (
            <CandidateRow key={picks[i]} id={picks[i]} rank={i + 1}
              right={
                <span className="actions">
                  <span className="meta">Cote {cote(app.byId[picks[i]])}</span>
                  <button className="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">↑</button>
                  <button className="icon" disabled={i === picks.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">↓</button>
                  <button className="icon" onClick={() => update(picks.filter((p) => p !== picks[i]))} aria-label="Retirer">×</button>
                </span>
              } />
          ) : (
            <div key={i} className="row empty">
              <span className="rank">{i + 1}</span>
              <span className="muted">{label}</span>
            </div>
          )
        )}
      </div>

      {picks.length < 5 && (
        <div className="adder">
          <select value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Choisir une candidate">
            <option value="">Ajouter une candidate…</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>{c.region} — {c.nom} (cote {cote(c)})</option>
            ))}
          </select>
          <button className="btn" disabled={!add} onClick={() => { update([...picks, add]); setAdd(""); }}>Ajouter</button>
        </div>
      )}

      <div className="savebar">
        <button className="btn primary" disabled={picks.length !== 5 || !dirty || state.saving} onClick={save}>
          {state.saving ? "Enregistrement…" : app.myPrediction ? "Enregistrer les modifications" : "Enregistrer mon Top 5"}
        </button>
        <span className={state.ok && !dirty ? "ok" : "muted"}>
          {state.msg && !dirty
            ? state.msg
            : picks.length !== 5
            ? `Encore ${5 - picks.length} candidate${5 - picks.length > 1 ? "s" : ""} à choisir.`
            : dirty
            ? "Modifications non enregistrées."
            : "Enregistré."}
        </span>
        {state.msg && !state.ok && <span className="error">{state.msg}</span>}
      </div>

      <details className="rules">
        <summary>Comment sont comptés les points ?</summary>
        <ul>
          <li>Une candidate de ton Top 5 présente dans le Top 5 réel rapporte 10 × sa cote.</li>
          <li>À la place exacte, les points sont doublés.</li>
          <li>Miss France 2027 trouvée en n° 1 : points triplés.</li>
          <li>La cote vient du modèle statistique (voir <Link href="/etude">l'étude</Link>) et se fige au verrouillage.</li>
        </ul>
      </details>
    </>
  );
}
