"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../providers";
import { cote } from "@/components/Bits";
import EtudeContent from "@/components/EtudeContent";
import { photosOf } from "@/lib/photos";
import { useTop5 } from "@/lib/top5";
import Help from "@/components/Help";
import { sized, onImgError } from "@/lib/img";

const RANKS = ["Miss France 2027", "1re dauphine", "2e dauphine", "3e dauphine", "4e dauphine"];
const N_SIM = 20000;
const pct = (p, d = 0) => `${(p * 100).toFixed(d).replace(".", ",")} %`;

// Simulation Plackett-Luce (astuce de Gumbel) sur les candidates encore en lice
function simulate(cands, out) {
  const live = cands.filter((c) => !out.has(c.id));
  const n = live.length;
  const s = live.map((c) => Number(c.score_base || 0) + Number(c.bonus || 0));
  const counts = live.map(() => [0, 0, 0, 0, 0]);
  const v = new Float64Array(n);
  const k5 = Math.min(5, n);
  for (let k = 0; k < N_SIM; k++) {
    for (let i = 0; i < n; i++) v[i] = s[i] - Math.log(-Math.log(Math.random() || 1e-12));
    for (let r = 0; r < k5; r++) {
      let b = 0;
      for (let i = 1; i < n; i++) if (v[i] > v[b]) b = i;
      counts[b][r]++;
      v[b] = -Infinity;
    }
  }
  const res = {};
  live.forEach((c, i) => { const pr = counts[i].map((x) => x / N_SIM); res[c.id] = { pr, p1: pr[0], p5: pr.reduce((a, b) => a + b, 0) }; });
  // Top 5 le plus probable : rang par rang, la candidate la plus probable à ce rang ou au-dessus
  const taken = new Set(), top = [];
  for (let r = 0; r < k5; r++) {
    let best = null, bv = -1;
    for (const c of live) {
      if (taken.has(c.id)) continue;
      const val = res[c.id].pr.slice(0, r + 1).reduce((a, b) => a + b, 0);
      if (val > bv) { bv = val; best = c; }
    }
    taken.add(best.id); top.push(best);
  }
  return { res, top };
}

export default function IA() {
  const app = useApp();
  const t = useTop5();
  const cands = app.candidates;
  const [out, setOut] = useState(() => new Set());
  const [mode, setMode] = useState("elim"); // elim | demi
  const [demi, setDemi] = useState(() => new Set());
  const [sim, setSim] = useState(null);
  const base = useMemo(() => simulate(cands, new Set()), [cands]);
  const eliminated = useMemo(() => (mode === "demi" && demi.size ? new Set(cands.filter((c) => !demi.has(c.id)).map((c) => c.id)) : out), [mode, demi, out, cands]);

  useEffect(() => {
    if (!eliminated.size) { setSim(null); return; }
    const id = setTimeout(() => setSim(simulate(cands, eliminated)), 30);
    return () => clearTimeout(id);
  }, [eliminated, cands]);

  const cur = sim || base;
  const list = [...cands].sort((a, b) => (cur.res[b.id]?.p5 ?? -1) - (cur.res[a.id]?.p5 ?? -1));
  const toggle = (id) => {
    if (mode === "demi") { const d = new Set(demi); d.has(id) ? d.delete(id) : d.add(id); setDemi(d); }
    else { const o = new Set(out); o.has(id) ? o.delete(id) : o.add(id); setOut(o); }
  };
  const reset = () => { setOut(new Set()); setDemi(new Set()); };
  const myOut = t.picks.filter((id) => id && eliminated.has(id));

  return (
    <article className="ia">
      <header className="ia-head">
        <p className="eyebrow">Pronostics de l'IA</p>
        <h1>Qui sera Miss France 2027 ? <Help title="Les pronos de l'IA" label="les pronostics de l'IA">Les chances viennent d'un modèle statistique entraîné sur les élections 2010-2026, complété par les signaux de la saison (presse, Instagram, photos). La cote vaut environ 1 / chance d'être dans le Top 5 : plus elle est haute, plus la candidate rapporte de points si tu la trouves. Choisis un scénario pour éliminer des candidates et voir les chances se redistribuer.</Help></h1>
        <p className="muted">Le modèle combine l'historique de 17 éditions et les signaux de la saison (presse, Instagram, couverture médiatique), recalculés tous les 3 jours. Joue avec les scénarios : élimine des candidates, ou coche les demi-finalistes le soir de l'élection, et vois comment les chances se redistribuent.</p>
      </header>

      <section className="ia-podium" aria-label="Top 5 le plus probable">
        {cur.top.map((c, i) => {
          const src = photosOf(app, c)[0]?.url;
          const r = cur.res[c.id];
          return (
            <Link key={`${c.id}-${i}`} href={`/candidate/${c.id}`} className={`ia-step s${i + 1} in`} style={{ animationDelay: `${i * 70}ms` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="ia-photo">{src && <img src={sized(src, 400)} onError={onImgError(src)} alt="" />}</span>
              <span className="ia-rank">{RANKS[i]}</span>
              <span className="name">{c.nom}</span>
              <span className="region">{c.region}</span>
              <span className="ia-p">{pct(r.p1)} victoire · {pct(r.p5)} Top 5</span>
            </Link>
          );
        })}
      </section>

      <section className="ia-scenario">
        <div className="ia-scenario-head">
          <h2>Scénarios</h2>
          <div className="seg" role="group" aria-label="Type de scénario">
            <button className={mode === "elim" ? "on" : ""} onClick={() => setMode("elim")}>Si elle est éliminée…</button>
            <button className={mode === "demi" ? "on" : ""} onClick={() => setMode("demi")}>Les demi-finalistes sont…</button>
          </div>
        </div>
        <p className="muted small">
          {mode === "elim"
            ? "Touche les candidates à éliminer : leurs chances se reportent sur les autres, selon la force de chacune."
            : `Touche les demi-finalistes annoncées pendant l'émission (${demi.size} cochée${demi.size > 1 ? "s" : ""}) : toutes les autres sont éliminées.`}
          {eliminated.size > 0 && <> · <button className="link" onClick={reset}>Tout réinitialiser</button></>}
        </p>
        {myOut.length > 0 && (
          <p className="hint warnbox">Attention : {myOut.map((id) => app.byId[id].nom.split(" ")[0]).join(", ")} {myOut.length > 1 ? "sont" : "est"} dans ton Top 5 et éliminée{myOut.length > 1 ? "s" : ""} dans ce scénario.</p>
        )}
        <div className="ia-grid">
          {list.map((c) => {
            const r = cur.res[c.id], b = base.res[c.id];
            const isOut = eliminated.has(c.id);
            const inDemi = demi.has(c.id);
            const d = r && b ? r.p5 - b.p5 : 0;
            const src = photosOf(app, c)[0]?.url;
            return (
              <button key={c.id} className={`ia-cand${isOut ? " out" : ""}${mode === "demi" && inDemi ? " qualified" : ""}`} onClick={() => toggle(c.id)} aria-pressed={mode === "demi" ? inDemi : isOut}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="ia-thumb">{src && <img src={sized(src, 160)} onError={onImgError(src)} alt="" loading="lazy" />}</span>
                <span className="ia-txt">
                  <span className="region">{c.region}</span>
                  <span className="name">{c.nom}</span>
                  {isOut ? <span className="meta">Éliminée</span> : (
                    <span className="ia-bar"><span style={{ width: `${Math.min(100, (r?.p5 || 0) * 100)}%` }} /></span>
                  )}
                </span>
                {!isOut && r && (
                  <span className="ia-num">
                    <strong>{pct(r.p5)}</strong>
                    {sim && Math.abs(d) >= 0.005 && <span className={`trend ${d > 0 ? "up" : "down"}`}>{d > 0 ? "+" : "−"}{Math.abs(Math.round(d * 100))}</span>}
                    <span className="meta">cote {cote(c)}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="small muted">Chances de Top 5 pour chaque candidate. Les cotes du jeu, elles, ne changent pas avec ces scénarios : elles se figent au début de la cérémonie.</p>
      </section>

      <EtudeContent />
    </article>
  );
}
