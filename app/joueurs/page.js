"use client";
import { useApp } from "../providers";
import { CandidateRow } from "@/components/Bits";
import { scoreFinal } from "@/lib/scoring";
import Help from "@/components/Help";

const hour = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

function Picks({ picks, detail }) {
  return (
    <div className="list">
      {picks.map((id, i) => (
        <CandidateRow key={id} id={id} rank={i + 1}
          right={detail ? <span className={`pts ${detail[i].status}`}>{detail[i].points > 0 ? `+${detail[i].points}` : "0"}</span> : null} />
      ))}
    </div>
  );
}

export default function Joueurs() {
  const app = useApp();
  const coteById = Object.fromEntries(app.candidates.map((c) => [c.id, c.cote]));
  const predBy = Object.fromEntries(app.predictions.map((p) => [p.email, p.picks]));
  const adjBy = Object.fromEntries(app.adjustments.map((p) => [p.email, p.picks]));

  if (!app.locked) {
    const played = app.status.filter((s) => s.has_played).length;
    return (
      <>
        <h1>Joueurs <Help title="Les joueurs" label="les joueurs">Avant la cérémonie, tu vois seulement qui a déjà enregistré son Top 5. Les pronostics de chacun s'affichent à 21 h 10, quand plus personne ne peut changer ; les ajustements, à 22 h 30.</Help></h1>
        <p className="muted">
          {played} sur {app.status.length} ont enregistré leur Top 5. Les pronostics de chacun seront visibles au début de la cérémonie
          {app.lockAt ? `, à ${hour(app.lockAt)}` : ""}.
        </p>
        <div className="list">
          {app.status.map((s) => (
            <div key={s.email} className="row">
              <span className="row-main"><span className="name">{s.display_name}</span></span>
              <span className={s.has_played ? "ok" : "muted"}>
                {s.has_played
                  ? `Enregistré le ${new Date(s.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
                  : "Pas encore joué"}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const rows = app.status
    .map((s) => {
      const main = predBy[s.email] || null;
      const adj = app.adjustLocked ? adjBy[s.email] || null : null;
      const score = main && app.results ? scoreFinal(main, adj, app.results, coteById) : null;
      return { ...s, main, adj, score };
    })
    .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1) || a.display_name.localeCompare(b.display_name, "fr"));

  return (
    <>
      <h1>{app.results ? "Classement" : "Les pronostics"} <Help title="Les scores" label="le calcul des scores">Une candidate de ton Top 5 présente dans le vrai Top 5 rapporte 10 × sa cote ; à la place exacte, c'est doublé ; Miss France trouvée en n° 1, triplé. Score final : 80 % Top 5 principal, 20 % ajustements.</Help></h1>
      {!app.results && (
        <p className="muted">
          {app.adjustLocked
            ? "Top 5 et ajustements verrouillés. Les scores s'afficheront avec les résultats."
            : `Top 5 principaux verrouillés. Les ajustements de chacun seront visibles à ${app.adjustUntil ? hour(app.adjustUntil) : "la fin des ajustements"}.`}
        </p>
      )}
      {app.results && (
        <section className="block">
          <h2>Résultat officiel</h2>
          <div className="list">{app.results.map((id, i) => <CandidateRow key={id} id={id} rank={i + 1} />)}</div>
          <p className="muted small">Score final = 80 % du Top 5 principal + 20 % de l'ajustement.</p>
        </section>
      )}
      {rows.map((r, n) => (
        <section key={r.email} className="block">
          <h2>
            {app.results && <span className="rank">{n + 1}</span>} {r.display_name}
            {r.score && <span className="pts"> {r.score.total} pts</span>}
          </h2>
          {r.main ? <Picks picks={r.main} detail={r.score?.main?.detail} /> : <p className="muted">Pas de Top 5 principal.</p>}
          {app.adjustLocked && (
            <>
              <h3 className="sub">Ajustement <span className="muted small">(20 %)</span></h3>
              {r.adj ? <Picks picks={r.adj} detail={r.score?.adjust?.detail} /> : <p className="muted small">Pas d'ajustement : le Top 5 principal compte pour cette part.</p>}
            </>
          )}
        </section>
      ))}
    </>
  );
}
