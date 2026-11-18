"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "../providers";
import { supabase } from "@/lib/supabase";
import { Thumb } from "@/components/Bits";
import { PhotoButton } from "@/components/PhotoViewer";
import Help from "@/components/Help";

const MIN = 5;
const pct = (x) => `${Math.round(x * 100)} %`;

// Bourse des joueurs : popularité des candidates dans les Top 5 enregistrés, comparée aux chances de l'IA.
// Aucun choix individuel n'est montré ; la bourse n'ouvre qu'à partir de 5 Top 5.
export default function Bourse() {
  const app = useApp();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [sort, setSort] = useState("top5");
  useEffect(() => {
    supabase.rpc("player_market").then(({ data, error }) => (error ? setErr(error.message) : setRows(data || [])));
  }, []);

  if (err) return <p className="error">{err}</p>;
  if (!rows) return <p className="muted">Chargement…</p>;
  const total = rows[0]?.total || 0;

  const head = (
    <>
      <h1>La bourse des joueurs <Help title="La bourse des joueurs" label="la bourse">
        Pour chaque candidate : la part des joueurs qui l'ont mise dans leur Top 5, et celle qui en font leur Miss France,
        à côté des chances calculées par l'IA. Personne ne voit qui a choisi qui. La bourse s'ouvre quand au moins {MIN} Top 5
        sont enregistrés, pour qu'on ne puisse pas deviner les choix des autres. Elle n'a aucun effet sur les points :
        le score se calcule avec les cotes de l'IA.
      </Help></h1>
      <p className="muted">Ce que pensent les joueurs, comparé à l'IA. Aucun choix individuel n'est affiché.</p>
    </>
  );

  if (total < MIN) {
    return (
      <>
        {head}
        <div className="bourse-wait">
          <strong>{total} Top 5 enregistré{total > 1 ? "s" : ""} sur {MIN} nécessaires</strong>
          <span className="bourse-meter"><span style={{ width: `${(total / MIN) * 100}%` }} /></span>
          <p className="muted small">La bourse s'ouvrira dès {MIN} Top 5 enregistrés. Invite tes amis depuis la page <Link href="/joueurs">Joueurs</Link> !</p>
        </div>
      </>
    );
  }

  const list = rows
    .map((r) => {
      const c = app.byId[r.candidate_id];
      if (!c) return null;
      const share = r.in_top5 / total, win = r.as_winner / total, ia = Number(c.p_top5) || 0, iaWin = Number(c.p_victoire) || 0;
      const gap = share - ia;
      const tag = r.in_top5 && gap >= 0.2 ? ["Chouchou des joueurs", "hot"] : ia >= 0.15 && gap <= -0.15 ? ["Pépite de l'IA", "gem"] : null;
      // Vue « Miss France » : on compare les couronnes (joueurs) aux chances de victoire (IA) ; sinon les places dans le Top 5
      const pj = sort === "miss" ? win : share, pi = sort === "miss" ? iaWin : ia;
      return { c, r, share, win, ia, iaWin, pj, pi, tag };
    })
    .filter(Boolean)
    .sort((a, b) => (sort === "miss" ? b.win - a.win || b.iaWin - a.iaWin : sort === "ia" ? b.ia - a.ia : b.share - a.share || b.win - a.win));
  const shown = list.filter((x) => (sort === "miss" ? x.r.as_winner > 0 || x.iaWin >= 0.05 : x.r.in_top5 > 0 || x.ia >= 0.1));
  const explain = {
    top5: "Barres : part des joueurs qui l'ont mise dans leur Top 5, et chance d'entrer dans le Top 5 selon l'IA.",
    miss: "Barres : part des joueurs qui en font leur Miss France, et chance d'être élue selon l'IA.",
    ia: "Classement par chance d'entrer dans le Top 5 selon l'IA, avec à côté le choix des joueurs.",
  }[sort];

  return (
    <>
      {head}
      <div className="head">
        <p className="muted small" style={{ margin: 0 }}>{total} Top 5 enregistrés</p>
        <div className="seg" role="group" aria-label="Vue">
          <button className={sort === "top5" ? "on" : ""} onClick={() => setSort("top5")}>Dans le Top 5</button>
          <button className={sort === "miss" ? "on" : ""} onClick={() => setSort("miss")}>Élue Miss France</button>
          <button className={sort === "ia" ? "on" : ""} onClick={() => setSort("ia")}>Selon l'IA</button>
        </div>
      </div>
      <p className="muted small">{explain}</p>
      <div className="list bourse">
        {shown.map(({ c, r, win, pj, pi, tag }, i) => (
          <div key={c.id} className="row bourse-row in" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
            <span className="rank">{i + 1}</span>
            <PhotoButton c={c}><Thumb c={c} size={48} /></PhotoButton>
            <span className="row-main">
              <Link href={`/candidate/${c.id}`} className="bourse-name">
                <span className="region">{c.region}</span>
                <span className="name">{c.nom}</span>
              </Link>
              <span className="bourse-bars">
                <span className="bb"><span className="lbl">Joueurs</span><span className="track"><span className="fill players" style={{ width: pct(pj) }} /></span><span className="val">{pct(pj)}</span></span>
                <span className="bb"><span className="lbl">IA</span><span className="track"><span className="fill ia" style={{ width: pct(pi) }} /></span><span className="val">{pct(pi)}</span></span>
              </span>
              <span className="meta">
                {r.as_winner ? `Miss France pour ${pct(win)} des joueurs` : "Personne ne la voit Miss France"}
                {r.in_top5 ? ` · rang moyen ${String(r.avg_rank).replace(".", ",")}` : ""}
              </span>
            </span>
            {tag && <span className={`bourse-tag ${tag[1]}`}>{tag[0]}</span>}
          </div>
        ))}
      </div>
      <p className="muted small">Les candidates choisies par personne et peu cotées par l'IA ne sont pas listées. « Chouchou des joueurs » : bien plus choisie que ce que prévoit l'IA ; « Pépite de l'IA » : l'inverse.</p>
    </>
  );
}
