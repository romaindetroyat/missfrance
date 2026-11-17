"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../providers";
import { PHOTO_TYPES, TYPE_LABEL, photosOf } from "@/lib/photos";
import { useTop5 } from "@/lib/top5";
import { useCompare } from "@/lib/compare";
import RankPicker from "@/components/RankPicker";
import Help from "@/components/Help";

const DURATION = 5000;
const ORDERS = {
  region: ["Région", (a, b) => a.region.localeCompare(b.region, "fr")],
  cote: ["Favorites", (a, b) => (a.cote ?? 99) - (b.cote ?? 99)],
  outsiders: ["Outsiders", (a, b) => (b.cote ?? 0) - (a.cote ?? 0)],
};
// Teinte propre à chaque région (écharpe colorée du défilé)
const hueOf = (id) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
const I = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function Defile() {
  const app = useApp();
  const t = useTop5();
  const cmp = useCompare();
  const [order, setOrder] = useState("region");
  const [type, setType] = useState("tout");
  const [i, setI] = useState(0);
  const [k, setK] = useState(0);
  const [dir, setDir] = useState("next");
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);

  const list = useMemo(() => [...app.candidates].sort(ORDERS[order][1]), [app.candidates, order]);
  const c = list[i] || list[0];
  const photos = c ? photosOf(app, c, type) : [];
  const cur = photos[Math.min(k, photos.length - 1)];

  const goCand = useCallback((d) => { setDir(d > 0 ? "next" : "prev"); setI((x) => (x + d + list.length) % list.length); setK(0); }, [list.length]);
  const goPhoto = useCallback((d) => {
    if (d > 0 && k >= photos.length - 1) return goCand(1);
    if (d < 0 && k === 0) return;
    setK((x) => x + d);
  }, [k, photos.length, goCand]);

  // Lecture automatique, comme des stories
  useEffect(() => {
    if (paused || !c) return;
    const id = setTimeout(() => goPhoto(1), DURATION);
    return () => clearTimeout(id);
  }, [paused, c, k, goPhoto]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,select,textarea")) return;
      if (e.key === "ArrowRight") goPhoto(1);
      else if (e.key === "ArrowLeft") goPhoto(-1);
      else if (e.key === "ArrowDown") { e.preventDefault(); goCand(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goCand(-1); }
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPhoto, goCand]);

  if (!c) return <p className="muted">Chargement…</p>;
  const pos = t.picks.indexOf(c.id);
  const inCmp = cmp.has(c.id);
  const next = list[(i + 1) % list.length];

  const onTouchStart = (e) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY, t: Date.now() }; setPaused(true); };
  const onTouchEnd = (e) => {
    const s = touch.current; touch.current = null; setPaused(false);
    if (!s) return;
    const p = e.changedTouches[0], dx = p.clientX - s.x, dy = p.clientY - s.y;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) goCand(dy < 0 ? 1 : -1);
    else if (Math.abs(dx) > 50) goPhoto(dx < 0 ? 1 : -1);
  };

  return (
    <div className="defile">
      <div className="defile-tools">
        <div className="seg" role="group" aria-label="Ordre">
          {Object.entries(ORDERS).map(([key, [label]]) => (
            <button key={key} className={order === key ? "on" : ""} onClick={() => { setOrder(key); setI(0); setK(0); }}>{label}</button>
          ))}
        </div>
        <div className="filters tight" role="group" aria-label="Type de photo">
          <button className={`chip${type === "tout" ? " on" : ""}`} onClick={() => { setType("tout"); setK(0); }}>Toutes</button>
          {PHOTO_TYPES.slice(0, 4).map(([key, label]) => (
            <button key={key} className={`chip${type === key ? " on" : ""}`} onClick={() => { setType(key); setK(0); }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="defile-layout">
        {/* File des candidates (ordinateur) */}
        <nav className="queue" aria-label="Candidates">
          {list.map((x, j) => {
            const src = photosOf(app, x)[0]?.url;
            return (
              <button key={x.id} className={`queue-item${j === i ? " on" : ""}`} onClick={() => { setDir(j > i ? "next" : "prev"); setI(j); setK(0); }} aria-current={j === i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="queue-img">{src && <img src={src} alt="" loading="lazy" />}</span>
                <span className="queue-txt"><span className="q-region" style={{ "--h": hueOf(x.id) }}>{x.region}</span><span className="name">{x.nom}</span></span>
                {t.picks.includes(x.id) && <span className="queue-rank">{t.picks.indexOf(x.id) + 1}</span>}
              </button>
            );
          })}
        </nav>

        {/* Story */}
        <section className="story" aria-label={`Photos de ${c.nom}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div key={`${c.id}-${dir}`} className={`story-frame ${dir === "next" ? "from-below" : "from-above"}`}>
            {cur ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={cur.id} src={cur.url} alt={cur.caption || c.nom} className="story-img kenburns" />
            ) : (
              <div className="story-empty">Pas encore de photo {TYPE_LABEL[type] ? `« ${TYPE_LABEL[type].toLowerCase()} »` : ""} vérifiée pour {c.nom.split(" ")[0]}.</div>
            )}
            <div className="story-shade" />
          </div>
          <div className="bars">
            {(photos.length ? photos : [null]).map((p, j) => (
              <span key={j}><span key={`${c.id}-${k}-${type}`} className={j < k ? "full" : j === k ? `run${paused ? " paused" : ""}` : ""} style={{ animationDuration: `${DURATION}ms` }} /></span>
            ))}
          </div>
          <div className="story-top">
            <span>{i + 1} / {list.length}{cur && TYPE_LABEL[cur.type] ? ` · ${TYPE_LABEL[cur.type]}` : ""}</span>
            <Help sheet title="Le défilé" label="le défilé">Les photos passent toutes seules. Touche à droite ou à gauche pour la photo suivante ou précédente, glisse vers le haut ou le bas (ou utilise les flèches) pour changer de candidate. Les boutons à droite l'ajoutent à ton Top 5 ou au comparateur.</Help>
            <button className="ghost-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Lecture" : "Pause"}>
              {paused ? <I d="M7 5l12 7-12 7z" size={18} /> : <I d="M8 5v14M16 5v14" size={18} />}
            </button>
          </div>
          <button className="tap left" onClick={() => goPhoto(-1)} aria-label="Photo précédente" />
          <button className="tap right" onClick={() => goPhoto(1)} aria-label="Photo suivante" />

          <div className="story-actions">
            <div>
              {t.editable ? (
                pos >= 0 ? (
                  <button key="on" className="act gold pop" onClick={() => t.toggle(c.id)} aria-label={`Retirer de mon Top 5 (n° ${pos + 1})`} data-tip="Retirer de mon Top 5" data-tip-side="left">{pos + 1}</button>
                ) : (
                  <button key="off" className="act" onClick={() => t.toggle(c.id)} disabled={t.full} aria-label="Ajouter à mon Top 5" data-tip="Ajouter à mon Top 5" data-tip-side="left"><I d="M12 5v14M5 12h14" /></button>
                )
              ) : <span className="act">{pos >= 0 ? pos + 1 : "–"}</span>}
              <span>Top 5</span>
            </div>
            <div>
              <button className={`act${inCmp ? " blue" : ""}`} onClick={() => cmp.toggle(c.id)} aria-label={inCmp ? "Retirer du comparateur" : "Ajouter au comparateur"} aria-pressed={inCmp} data-tip={inCmp ? "Retirer du comparateur" : "Comparer"} data-tip-side="left">
                <I d="M3 5h7v14H3zM14 5h7v14h-7z" />
              </button>
              <span>Comparer</span>
            </div>
            <div>
              <Link className="act" href={`/candidate/${c.id}`} aria-label="Voir la fiche et toutes les photos"><I d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></Link>
              <span>Fiche</span>
            </div>
          </div>

          <div key={`sash-${c.id}`} className="sash" style={{ "--h": hueOf(c.id) }} aria-hidden>
            <span>Miss {c.region}</span>
          </div>
          <div key={`id-${c.id}`} className="story-id rise">
            <span className="story-region">Miss {c.region}</span>
            <h1>{c.nom}</h1>
            <span className="story-meta">{[c.age && `${c.age} ans`, c.taille_cm && `${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m`, c.ville].filter(Boolean).join(" · ")}</span>
          </div>

          <div className="story-nav">
            <button className="nav-sq" onClick={() => goCand(-1)} aria-label="Candidate précédente"><I d="M6 15l6-6 6 6" size={20} /></button>
            <button className="nav-next" onClick={() => goCand(1)}>Suivante : <span className="nn-region">{next.region}</span> <I d="M6 9l6 6 6-6" size={18} /></button>
            <Link href="/comparer" className={`nav-cmp${cmp.ids.length ? " on" : ""}`}>Comparer · {cmp.ids.length}</Link>
          </div>
        </section>

        {/* Fiche (ordinateur) */}
        <aside className="story-side" aria-label="Fiche">
          <p className="region">Miss {c.region}</p>
          <h2>{c.nom}</h2>
          <p className="small muted" style={{ margin: 0 }}>{[c.age && `${c.age} ans`, c.taille_cm && `${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m`, c.ville].filter(Boolean).join(" · ")}</p>
          {photos.length > 1 && (
            <div className="side-thumbs">
              {photos.map((p, j) => (
                <button key={p.id} className={j === k ? "on" : ""} onClick={() => setK(j)} aria-label={`Photo ${j + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>Sa place dans mon Top 5</p>
          <RankPicker t={t} id={c.id} />
          <div className="side-actions">
            <button className="btn" onClick={() => cmp.toggle(c.id)}>{inCmp ? "Retirer du comparateur" : "Ajouter au comparateur"}</button>
            <Link className="btn" href={`/candidate/${c.id}`}>Fiche complète</Link>
          </div>
          <p className="small muted keys">Clavier : ← → photos · ↑ ↓ candidates · espace pause</p>
        </aside>
      </div>
    </div>
  );
}
