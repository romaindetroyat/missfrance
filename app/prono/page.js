"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "../providers";
import { CandidateRow, cote } from "@/components/Bits";
import { useDraft } from "@/lib/draft";
import { RANKS, scoreFinal } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

const fmt = (t) =>
  new Date(t).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const hour = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

// Éditeur d'un Top 5 ordonné, avec brouillon local et enregistrement dans la table indiquée.
function Editor({ table, kind, saved, fallbackPicks, label }) {
  const app = useApp();
  const { picks, update, clear, dirty } = useDraft(app.email, saved, kind, fallbackPicks);
  const [state, setState] = useState({ saving: false, msg: "", ok: false });
  const [add, setAdd] = useState("");

  const move = (i, d) => {
    const next = [...picks];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    update(next);
  };

  async function save() {
    setState({ saving: true, msg: "", ok: false });
    const { error } = await supabase.from(table).upsert({ email: app.email, picks });
    if (error) {
      const closed = /verrouill|ouverts/i.test(error.message);
      return setState({ saving: false, ok: false, msg: closed ? "C'est trop tard : cette phase est fermée." : "L'enregistrement a échoué. Ton brouillon est conservé, réessaie." });
    }
    await app.reload();
    clear();
    setState({ saving: false, msg: `${label} enregistré.`, ok: true });
  }

  const others = app.candidates.filter((c) => !picks.includes(c.id));

  return (
    <>
      <div className="list">
        {RANKS.map((r, i) =>
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
              <span className="muted">{r}</span>
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
          {state.saving ? "Enregistrement…" : saved ? "Enregistrer les modifications" : `Enregistrer ${label.toLowerCase()}`}
        </button>
        <span className={state.ok && !dirty ? "ok" : "muted"}>
          {state.msg && state.ok && !dirty
            ? state.msg
            : picks.length !== 5
            ? `Encore ${5 - picks.length} candidate${5 - picks.length > 1 ? "s" : ""} à choisir.`
            : dirty
            ? "Modifications non enregistrées."
            : "Enregistré."}
        </span>
        {state.msg && !state.ok && <span className="error">{state.msg}</span>}
      </div>
    </>
  );
}

function ReadOnly({ picks, detail }) {
  const app = useApp();
  return (
    <div className="list">
      {picks.map((id, i) => (
        <CandidateRow key={id} id={id} rank={i + 1}
          right={detail ? <span className={`pts ${detail[i].status}`}>{detail[i].points} pts</span> : <span className="meta">Cote {cote(app.byId[id])}</span>} />
      ))}
    </div>
  );
}

export default function Prono() {
  const app = useApp();
  const main = app.myPrediction?.picks || null;
  const adj = app.myAdjustment?.picks || null;
  const coteById = Object.fromEntries(app.candidates.map((c) => [c.id, c.cote]));
  const score = app.results && main ? scoreFinal(main, adj, app.results, coteById) : null;

  const rules = (
    <details className="rules">
      <summary>Comment sont comptés les points ?</summary>
      <ul>
        <li>Une candidate de ton Top 5 présente dans le Top 5 réel rapporte 10 × sa cote ; à la place exacte, les points sont doublés ; Miss France 2027 trouvée en n° 1 : triplés.</li>
        <li>Score final : 80 % pour le Top 5 principal, 20 % pour les ajustements de dernière minute. Sans ajustement, ton Top 5 principal compte pour les deux parts.</li>
        <li>La cote vient du modèle statistique (voir <Link href="/etude">l'étude</Link>) et se fige au début de la cérémonie.</li>
      </ul>
    </details>
  );

  // Phase 1 : avant la cérémonie
  if (!app.locked) {
    return (
      <>
        <h1>Mon Top 5</h1>
        <p className="muted">
          Dans l'ordre : la n° 1 est ta Miss France 2027. Modifiable jusqu'au début de la cérémonie
          {app.lockAt ? ` (${fmt(app.lockAt)})` : ""}. Pendant l'émission, tu pourras encore faire des ajustements de dernière minute
          {app.adjustUntil ? ` jusqu'à ${hour(app.adjustUntil)}` : ""}, qui compteront pour 20 % du score.
        </p>
        <Editor table="predictions" kind="top5" saved={app.myPrediction} label="Mon Top 5" />
        {rules}
      </>
    );
  }

  // Phase 2 : pendant la cérémonie, ajustements
  if (!app.adjustLocked) {
    return (
      <>
        <h1>Ajustements de dernière minute</h1>
        <p className="muted">
          Ton Top 5 principal est verrouillé. Jusqu'à {app.adjustUntil ? hour(app.adjustUntil) : "la fin des ajustements"}, tu peux
          enregistrer un Top 5 ajusté d'après ce que tu vois à l'écran : il comptera pour 20 % du score final.
        </p>
        <Editor table="adjustments" kind="ajust" saved={app.myAdjustment} fallbackPicks={main} label="Mon ajustement" />
        <h2>Mon Top 5 principal <span className="muted small">(80 %)</span></h2>
        {main ? <ReadOnly picks={main} /> : <p className="muted">Tu n'as pas enregistré de Top 5 principal avant la cérémonie.</p>}
        {rules}
      </>
    );
  }

  // Après les ajustements
  return (
    <>
      <h1>Mon Top 5</h1>
      <p className="muted">{app.results ? "Résultats publiés." : "Les pronostics sont verrouillés. Les scores s'afficheront après la cérémonie."}</p>
      <h2>Top 5 principal <span className="muted small">(80 %)</span></h2>
      {main ? <ReadOnly picks={main} detail={score?.main?.detail} /> : <p>Tu n'as pas enregistré de Top 5 principal.</p>}
      <h2>Ajustement <span className="muted small">(20 %)</span></h2>
      {adj ? <ReadOnly picks={adj} detail={score?.adjust?.detail} /> : <p className="muted">Pas d'ajustement : ton Top 5 principal compte pour cette part.</p>}
      {score && <p className="total">Score final : {score.total} points. <Link href="/joueurs">Voir le classement</Link></p>}
      {rules}
    </>
  );
}
