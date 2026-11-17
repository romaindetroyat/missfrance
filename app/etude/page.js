"use client";
import Link from "next/link";
import pred from "@/data/model/predictions.json";
import valid from "@/data/model/validation.json";
import stats from "@/data/model/stats.json";
import { useApp } from "../providers";
import { RANKS } from "@/lib/scoring";

const pct = (p, d = 1) => `${(p * 100).toFixed(d).replace(".", ",")} %`;
const num = (n) => String(n).replace(".", ",");
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Etude() {
  const app = useApp();
  const idByRegion = Object.fromEntries(app.candidates.map((c) => [slug(c.region.replace(/^Miss\s+/i, "").replace(/\s+20\d\d$/, "")), c.id]));
  const link = (o) => {
    const id = idByRegion[slug(o.region)];
    return id ? <Link href={`/candidate/${id}`}>{o.nom}</Link> : o.nom;
  };
  const max = Math.max(...pred.candidates.map((c) => c.p_top5));
  const v = valid.resume;
  const t = stats.taille;

  return (
    <article className="study">
      <h1>Étude statistique</h1>
      <p className="muted">
        Modèle mis à jour le {new Date(pred.genere_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}, à partir de{" "}
        {stats.n_candidates} candidates sur {stats.n_editions} éditions (Miss France 2010 à 2026).
      </p>

      <h2>Le Top 5 le plus probable</h2>
      <div className="list">
        {pred.top5_pronostic.map((o, i) => (
          <div key={o.region} className="row">
            <span className="rank">{o.rang}</span>
            <span className="row-main">
              <span className="region">{RANKS[i]} · {o.region}</span>
              <span className="name">{link(o)}</span>
            </span>
            <span className="meta">Top 5 : {pct(o.p_top5, 0)} · victoire : {pct(o.p_victoire, 0)}</span>
          </div>
        ))}
      </div>
      <p className="hint">
        À lire avec prudence : la favorite du modèle n'a que {pct(pred.candidates[0].p_victoire, 0)} de chances de gagner. Les données
        disponibles aujourd'hui (taille, région, région hôte) disent peu de chose de l'élection ; le classement s'affinera avec les
        signaux de dernière ligne droite.
      </p>

      <h2>Toutes les candidates</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Candidate</th><th className="n">Top 5</th><th className="n">Victoire</th><th className="n">Cote</th></tr>
          </thead>
          <tbody>
            {pred.candidates.map((o) => (
              <tr key={o.region}>
                <td>
                  <span className="region">{o.region}</span><br />{link(o)}
                  <span className="meter"><span style={{ width: `${(o.p_top5 / max) * 100}%` }} /></span>
                </td>
                <td className="n">{pct(o.p_top5)}</td>
                <td className="n">{pct(o.p_victoire)}</td>
                <td className="n">{num(o.cote.toFixed(1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Ce que disent 17 éditions</h2>
      <ul className="notes">
        <li>
          <strong>La taille compte.</strong> Les gagnantes mesurent {num(t.gagnantes)} cm en moyenne contre {num(t.toutes)} cm pour l'ensemble ;{" "}
          {t.gagnantes_175_plus} gagnantes sur {stats.n_editions} font 1,75 m ou plus, alors que seules {pct(t.part_candidates_175_plus, 0)} des candidates
          atteignent cette taille. Taux de Top 5 : {pct(t.top5_si_175_plus, 0)} au-dessus de 1,75 m, {pct(t.top5_si_moins_175, 0)} en dessous.
        </li>
        <li>
          <strong>L'âge ne dit presque rien.</strong> {num(stats.age.gagnantes)} ans en moyenne pour les gagnantes, {num(stats.age.toutes)} pour
          l'ensemble ; l'écart tient à une seule gagnante de 34 ans. L'âge a été testé puis retiré du modèle.
        </li>
        <li>
          <strong>Certaines régions reviennent souvent.</strong> Voir le tableau ci-dessous : Tahiti et la Guadeloupe placent une candidate dans
          le Top 5 environ une année sur deux.
        </li>
        <li>
          <strong>La région hôte aide à entrer en demi-finale, pas à gagner.</strong> {stats.hote.demi} demi-finales, {stats.hote.top5} Top 5 et{" "}
          {stats.hote.victoires} victoire en {stats.hote.n} éditions.
        </li>
        <li>
          <strong>Le public pèse lourd.</strong> Les demi-finalistes sont choisies par un jury interne ; ensuite le vote est partagé à 50/50
          entre public et jury. La future gagnante était 1re ou 2e du vote public en demi-finale dans 16 éditions sur 17.
        </li>
      </ul>

      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Région (2010-2026)</th><th className="n">Victoires</th><th className="n">Top 5</th><th className="n">Demi-finales</th><th className="n">Participations</th></tr>
          </thead>
          <tbody>
            {stats.regions.slice(0, 12).map((r) => (
              <tr key={r.region}><td>{r.region}</td><td className="n">{r.victoires}</td><td className="n">{r.top5}</td><td className="n">{r.demi}</td><td className="n">{r.participations}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>La méthode</h2>
      <p>
        Chaque candidate reçoit un score de force à partir de quatre critères ; un modèle de classement (logit ordonné, dit de Plackett-Luce)
        est ajusté sur l'ordre réel des Top 5 passés. On simule ensuite 200 000 élections pour obtenir la probabilité de chaque place.
      </p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Critère</th><th className="n">Poids</th></tr></thead>
          <tbody>
            {Object.values(pred.coefficients).map((c) => (
              <tr key={c.libelle}><td>{c.libelle}</td><td className="n">{c.beta > 0 ? "+" : ""}{num(c.beta.toFixed(2))}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Un poids de +0,69 double la force relative d'une candidate. L'historique régional est lissé pour ne pas surévaluer les régions peu représentées.</p>

      <h2>Que vaut ce modèle ?</h2>
      <p>
        Testé en cachant chaque édition à tour de rôle : il retrouve en moyenne {num(v.top5_trouvees_moyenne)} finalistes sur 5, contre{" "}
        {num(v.top5_hasard_moyenne)} au hasard. La gagnante réelle figurait dans ses 5 favorites {v.gagnante_dans_top5_modele} fois sur {v.editions}, et
        dans ses 10 favorites {v.gagnante_dans_top10_modele} fois. C'est mieux que le hasard, mais loin d'une certitude : l'essentiel se joue sur ce
        que le modèle ne voit pas (prestance, discours, popularité).
      </p>

      <h2>Ce qui fera bouger les cotes</h2>
      <ul className="notes">
        <li>Le classement des candidates les plus suivies sur Instagram : la n° 1 a fini 1re ou 2e lors des trois éditions documentées.</li>
        <li>Les favorites de la presse et des sites de fans, publiées dans les deux dernières semaines.</li>
        <li>Le prix de culture générale, signal en net recul depuis 2021.</li>
      </ul>
      <p className="muted small">
        Aucun sondage ni cote de bookmaker n'était publié au 17 novembre 2026. Les cotes sont recalculées tous les 3 jours, puis figées au
        verrouillage des pronostics. Sources : pages Wikipédia des éditions 2010 à 2027.
      </p>
    </article>
  );
}
