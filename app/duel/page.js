"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "../providers";
import { cote } from "@/components/Bits";
import { photosOf } from "@/lib/photos";
import { useTop5 } from "@/lib/top5";
import { RANKS } from "@/lib/scoring";
import Help from "@/components/Help";
import { sized, onImgError } from "@/lib/img";

const KEY = "mf2027-duels";
const ROUND = 12;
const TABS = [["officiel", "Portraits"], ["election", "Élection"], ["maillot", "Maillot"], ["tout", "Toutes"]];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const store = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const fresh = () => ({ wins: {}, seen: {}, played: 0, target: ROUND });

// Classement : taux de victoire lissé (évite qu'un seul duel gagné place une candidate en tête)
function ranking(cands, s) {
  return cands
    .map((c) => ({ c, w: s.wins[c.id] || 0, v: s.seen[c.id] || 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => (b.w + 1) / (b.v + 2) - (a.w + 1) / (a.v + 2) || b.w - a.w);
}

export default function Duel() {
  const app = useApp();
  const t = useTop5();
  const [s, setS] = useState(null);
  const [pair, setPair] = useState(null);
  const [tab, setTab] = useState("officiel");
  const [flash, setFlash] = useState(null);
  const cands = app.candidates;

  const pick = useCallback((st) => {
    const seen = (c) => st.seen[c.id] || 0;
    const rate = (c) => ((st.wins[c.id] || 0) + 1) / (seen(c) + 2);
    const order = [...cands].sort((a, b) => seen(a) - seen(b) || Math.random() - 0.5);
    const a = order[0];
    const b = order.slice(1, 12).sort((x, y) => Math.abs(rate(x) - rate(a)) - Math.abs(rate(y) - rate(a)))[0];
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }, [cands]);

  useEffect(() => {
    const st = load() || fresh();
    setS(st);
    setPair(pick(st));
  }, [pick]);

  const vote = useCallback((winner) => {
    if (!pair || flash) return;
    const [a, b] = pair;
    const next = { ...s, wins: { ...s.wins }, seen: { ...s.seen, [a.id]: (s.seen[a.id] || 0) + 1, [b.id]: (s.seen[b.id] || 0) + 1 }, played: s.played + 1 };
    if (winner) next.wins[winner.id] = (next.wins[winner.id] || 0) + 1;
    setFlash(winner ? winner.id : "skip");
    setTimeout(() => { setS(next); store(next); setPair(pick(next)); setFlash(null); }, winner ? 420 : 120);
  }, [pair, s, pick, flash]);

  useEffect(() => {
    const onKey = (e) => {
      if (!pair || !s || s.played >= s.target) return;
      if (e.key === "ArrowLeft") vote(pair[0]);
      else if (e.key === "ArrowRight") vote(pair[1]);
      else if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); vote(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, s, vote]);

  const rank = useMemo(() => (s ? ranking(cands, s) : []), [cands, s]);
  if (!s || !pair) return <p className="muted">Chargement…</p>;
  const done = s.played >= s.target;
  const roundNo = s.played - (s.target - ROUND) + 1;

  if (done) {
    const top = rank.slice(0, 5);
    return (
      <div className="duel-end">
        <h1>Ton classement d'après tes duels <Help title="Ton classement" label="le classement des duels">Chaque candidate est classée selon la part de duels qu'elle a gagnés. « Utiliser comme mon Top 5 » remplit ton Top 5 avec les cinq premières ; tu peux ensuite le modifier.</Help></h1>
        <p className="muted">{s.played} duels joués. Classement selon ton taux de victoire, lissé pour ne pas surévaluer une candidate vue une seule fois.</p>
        <ol className="t5-list">
          {top.map((x, n) => {
            const src = photosOf(app, x.c)[0]?.url;
            return (
              <li key={x.c.id} className="t5-row in" style={{ animationDelay: `${n * 80}ms` }}>
                <span className="rank solid">{n + 1}</span>
                <Link href={`/candidate/${x.c.id}`} className="t5-who">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="thumb">{src && <img src={sized(src, 120)} onError={onImgError(src)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />}</span>
                  <span><span className="region">{RANKS[n]}</span><span className="name">{x.c.nom}</span></span>
                </Link>
                <span className="meta">{x.w} / {x.v} gagnés</span>
              </li>
            );
          })}
        </ol>
        <div className="duel-end-actions">
          {t.editable && top.length === 5 && <button className="btn primary" onClick={() => t.setAll(top.map((x) => x.c.id))}>Utiliser comme mon Top 5</button>}
          <button className="btn" onClick={() => { const st = { ...s, target: s.target + ROUND }; setS(st); store(st); }}>Continuer : {ROUND} duels de plus</button>
          <button className="btn" onClick={() => { const st = fresh(); setS(st); store(st); setPair(pick(st)); }}>Tout recommencer</button>
        </div>
        {rank.length > 5 && (
          <details className="rules"><summary>Voir tout le classement ({rank.length})</summary>
            <ol>{rank.map((x) => <li key={x.c.id}>{x.c.nom} — {x.w}/{x.v}</li>)}</ol>
          </details>
        )}
      </div>
    );
  }

  const [A, B] = pair;
  const max = (a, b) => Math.max(a || 0, b || 0) || 1;
  const stats = [
    ["Taille", A.taille_cm, B.taille_cm, (v) => (v ? `${(v / 100).toFixed(2).replace(".", ",")} m` : "—")],
    ["Top 5", A.p_top5 * 100, B.p_top5 * 100, (v) => `${Math.round(v)} %`],
    ["Âge", A.age, B.age, (v) => (v ? `${v} ans` : "—")],
  ];

  return (
    <div className="duel">
      <div className="duel-head">
        <div>
          <h1>Duel <Help title="Le duel" label="le duel">Deux candidates, une seule préférée : touche celle que tu choisis (ou utilise les flèches du clavier). Après 12 duels, ton classement apparaît et tu peux l'utiliser comme Top 5.</Help></h1>
          <p className="muted">Laquelle verrais-tu plus haut le soir de l'élection ? Touche sa photo.</p>
        </div>
        <span className="muted small">Duel {roundNo} sur {ROUND}</span>
      </div>
      <div className="progress"><span style={{ width: `${((roundNo - 1) / ROUND) * 100}%` }} /></div>
      <div className="filters tight" role="group" aria-label="Type de photo">
        {TABS.map(([k, l]) => <button key={k} className={`chip${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      <div className="duel-arena" key={`${A.id}-${B.id}`}>
        {[A, B].map((c, n) => {
          const ph = photosOf(app, c, tab);
          const src = (ph[0] || photosOf(app, c)[0])?.url;
          const state = flash ? (flash === c.id ? "win" : flash === "skip" ? "" : "lose") : "";
          return (
            <button key={c.id} className={`duel-card ${n ? "from-right" : "from-left"} ${state}`} onClick={() => vote(c)} aria-label={`Je préfère ${c.nom}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src ? <img src={sized(src, 800)} onError={onImgError(src)} alt="" /> : <span className="placeholder" />}
              {!ph.length && tab !== "tout" && <span className="pill">Pas de photo de ce type</span>}
              <span className="duel-name"><span className="region">{c.region}</span><span className="name">{c.nom}</span><span className="meta">Cote {cote(c)}</span></span>
              <span className="duel-key" aria-hidden>{n ? "→" : "←"}</span>
            </button>
          );
        })}
        <span className="vs" aria-hidden>VS</span>
      </div>

      <div className="duel-stats">
        {stats.map(([label, a, b, f]) => (
          <div key={label} className="duel-stat">
            <span className="v">{f(a)}</span>
            <span className="bar left"><span style={{ width: `${((a || 0) / max(a, b)) * 100}%` }} /></span>
            <span className="l">{label}</span>
            <span className="bar right"><span style={{ width: `${((b || 0) / max(a, b)) * 100}%` }} /></span>
            <span className="v r">{f(b)}</span>
          </div>
        ))}
      </div>
      <div className="duel-foot">
        <button className="btn" onClick={() => vote(null)}>Je ne sais pas, passer</button>
        <span className="small muted keys">Clavier : ← gauche · → droite · ↓ passer</span>
      </div>
    </div>
  );
}
