"use client";
import Link from "next/link";
import { useApp } from "../providers";
import { CandidateRow, cote } from "@/components/Bits";
import Top5Panel from "@/components/Top5Panel";
import { useTop5 } from "@/lib/top5";
import { RANKS, scoreFinal } from "@/lib/scoring";

const fmt = (t) =>
  new Date(t).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const hour = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

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
  const t = useTop5();
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
        <li>La cote vient du modèle statistique (voir <Link href="/ia">les pronos de l'IA</Link>) et se fige au début de la cérémonie.</li>
      </ul>
    </details>
  );

  // Phase 1 : avant la cérémonie
  if (!app.locked) {
    return (
      <>
        <h1>Mon Top 5</h1>
        <p className="muted">
          Remplis les places dans l'ordre que tu veux : tu peux désigner ta 3e dauphine avant ta Miss France. Modifiable jusqu'au début de la cérémonie
          {app.lockAt ? ` (${fmt(app.lockAt)})` : ""}. Pendant l'émission, tu pourras encore faire des ajustements de dernière minute
          {app.adjustUntil ? ` jusqu'à ${hour(app.adjustUntil)}` : ""}, qui compteront pour 20 % du score.
        </p>
        <Top5Panel t={t} />
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
        <Top5Panel t={t} />
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
