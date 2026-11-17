"use client";
import { useApp } from "../providers";
import { CandidateRow } from "@/components/Bits";
import { scorePrediction } from "@/lib/scoring";

export default function Joueurs() {
  const app = useApp();
  const coteById = Object.fromEntries(app.candidates.map((c) => [c.id, c.cote]));
  const predBy = Object.fromEntries(app.predictions.map((p) => [p.email, p]));

  if (!app.locked) {
    const played = app.status.filter((s) => s.has_played).length;
    return (
      <>
        <h1>Joueurs</h1>
        <p className="muted">
          {played} sur {app.status.length} ont enregistré leur Top 5. Les pronostics de chacun seront visibles au verrouillage, 2 heures avant la cérémonie.
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
      const picks = predBy[s.email]?.picks || null;
      const score = picks && app.results ? scorePrediction(picks, app.results, coteById) : null;
      return { ...s, picks, score };
    })
    .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1) || a.display_name.localeCompare(b.display_name, "fr"));

  return (
    <>
      <h1>{app.results ? "Classement" : "Les pronostics"}</h1>
      {!app.results && <p className="muted">Pronostics verrouillés. Les scores s'afficheront après la cérémonie.</p>}
      {app.results && (
        <section className="block">
          <h2>Résultat officiel</h2>
          <div className="list">{app.results.map((id, i) => <CandidateRow key={id} id={id} rank={i + 1} />)}</div>
        </section>
      )}
      {rows.map((r, n) => (
        <section key={r.email} className="block">
          <h2>
            {app.results && <span className="rank">{n + 1}</span>} {r.display_name}
            {r.score && <span className="pts"> {r.score.total} pts</span>}
          </h2>
          {r.picks ? (
            <div className="list">
              {r.picks.map((id, i) => (
                <CandidateRow key={id} id={id} rank={i + 1}
                  right={r.score ? (
                    <span className={`pts ${r.score.detail[i].status}`}>
                      {r.score.detail[i].points > 0 ? `+${r.score.detail[i].points}` : "0"}
                    </span>
                  ) : null} />
              ))}
            </div>
          ) : (
            <p className="muted">Pas de pronostic.</p>
          )}
        </section>
      ))}
    </>
  );
}
