"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../providers";
import { cote } from "@/components/Bits";
import { photosOf, TYPE_LABEL } from "@/lib/photos";
import { useTop5 } from "@/lib/top5";
import { useCompare, COMPARE_MAX } from "@/lib/compare";
import { useDrag } from "@/components/Drag";
import Help from "@/components/Help";

const TABS = [["officiel", "Portrait officiel"], ["election", "Robe & écharpe"], ["maillot", "Maillot"], ["voyage", "Voyage"], ["tout", "Toutes"]];
const I = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function Zoom({ c, photos, start, onClose }) {
  const [k, setK] = useState(start);
  const [z, setZ] = useState(1);
  const [o, setO] = useState({ x: 50, y: 30 });
  const box = useRef(null);
  const p = photos[k];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setK((x) => Math.min(photos.length - 1, x + 1)); setZ(1); }
      if (e.key === "ArrowLeft") { setK((x) => Math.max(0, x - 1)); setZ(1); }
      if (e.key === "+" || e.key === "=") setZ((v) => Math.min(4, v + 0.5));
      if (e.key === "-") setZ((v) => Math.max(1, v - 0.5));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [photos.length, onClose]);
  const at = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  return (
    <div className="zoom" role="dialog" aria-modal="true" aria-label={`Zoom sur ${c.nom}`}>
      <div className="zoom-bar">
        <span>{c.nom} · {k + 1}/{photos.length}{TYPE_LABEL[p?.type] ? ` · ${TYPE_LABEL[p.type]}` : ""}</span>
        <button className="ghost-btn" onClick={onClose} aria-label="Fermer"><I d="M6 6l12 12M18 6L6 18" /></button>
      </div>
      <div ref={box} className={`zoom-stage${z > 1 ? " zoomed" : ""}`}
        onClick={(e) => { setO(at(e)); setZ((v) => (v > 1 ? (Math.abs(at(e).x - o.x) < 3 ? 1 : v) : 2.5)); }}
        onMouseMove={(e) => z > 1 && window.matchMedia("(hover: hover)").matches && setO(at(e))}
        onWheel={(e) => { setO(at(e)); setZ((v) => Math.max(1, Math.min(4, v - e.deltaY / 400))); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p && <img key={p.id} src={p.url} alt={p.caption || c.nom} className="fadein" style={{ transform: `scale(${z})`, transformOrigin: `${o.x}% ${o.y}%` }} />}
        <span className="zoom-hint">{z > 1 ? "Déplace-toi avec la souris ou touche un autre endroit · molette pour zoomer" : "Touche ou clique pour zoomer"}</span>
        {photos.length > 1 && <>
          <button className="arrow left" disabled={k === 0} onClick={(e) => { e.stopPropagation(); setK(k - 1); setZ(1); }} aria-label="Photo précédente"><I d="M15 6l-6 6 6 6" size={20} /></button>
          <button className="arrow right" disabled={k === photos.length - 1} onClick={(e) => { e.stopPropagation(); setK(k + 1); setZ(1); }} aria-label="Photo suivante"><I d="M9 6l6 6-6 6" size={20} /></button>
        </>}
      </div>
      <div className="zoom-slider">
        <span>1×</span>
        <input type="range" min="1" max="4" step="0.25" value={z} onChange={(e) => setZ(Number(e.target.value))} aria-label="Niveau de zoom" />
        <span>4×</span>
      </div>
    </div>
  );
}

export default function Comparer() {
  const app = useApp();
  const t = useTop5();
  const cmp = useCompare();
  const dnd = useDrag();
  const [tab, setTab] = useState("officiel");
  const [ks, setKs] = useState({});
  const [zoom, setZoom] = useState(null);
  const [adding, setAdding] = useState("");
  const sel = cmp.ids.map((id) => app.byId[id]).filter(Boolean);
  const others = app.candidates.filter((c) => !cmp.has(c.id)).sort((a, b) => a.region.localeCompare(b.region, "fr"));

  if (!sel.length) {
    const fav = [...app.candidates].sort((a, b) => (a.cote ?? 99) - (b.cote ?? 99)).slice(0, 3).map((c) => c.id);
    return (
      <div className="cmp-empty">
        <h1>Comparer <Help title="Le comparateur" label="le comparateur">Choisis jusqu'à 4 candidates avec l'icône « comparer » de la grille ou du défilé. Elles s'affichent côte à côte avec le même type de photo. Clique sur une photo pour zoomer (molette ou curseur), et regarde le tableau : la meilleure valeur de chaque ligne est mise en avant.</Help></h1>
        <p className="muted">Mets jusqu'à {COMPARE_MAX} candidates côte à côte, sur le même type de photo, avec leurs chiffres.</p>
        <div className="side-actions">
          {t.count >= 2 && <button className="btn primary" onClick={() => cmp.set(t.picks.filter(Boolean).slice(0, COMPARE_MAX))}>Comparer mon Top 5</button>}
          <button className="btn" onClick={() => cmp.set(fav)}>Comparer les 3 favorites du modèle</button>
          <Link className="btn" href="/defile">Choisir depuis le défilé</Link>
        </div>
      </div>
    );
  }

  const rows = [
    ["Cote", (c) => Number(c.cote), (v) => cote({ cote: v }), "min"],
    ["Chances de Top 5", (c) => Number(c.p_top5), (v) => `${Math.round(v * 100)} %`, "max"],
    ["Chances de victoire", (c) => Number(c.p_victoire), (v) => `${Math.round(v * 100)} %`, "max"],
    ["Taille", (c) => c.taille_cm, (v) => (v ? `${(v / 100).toFixed(2).replace(".", ",")} m` : "—"), "max"],
    ["Âge", (c) => c.age, (v) => (v ? `${v} ans` : "—"), null],
    ["Photos vérifiées", (c) => (app.photosBy[c.id] || []).length, (v) => `${v}`, "max"],
  ];

  return (
    <div className="cmp">
      <div className="cmp-head">
        <h1>Comparer <span className="muted small">{sel.length}/{COMPARE_MAX}</span> <Help title="Le comparateur" label="le comparateur">Les candidates s'affichent côte à côte avec le même type de photo. Clique sur une photo pour zoomer (molette ou curseur). Dans le tableau, la meilleure valeur de chaque ligne est mise en avant.</Help></h1>
        {sel.length < COMPARE_MAX && (
          <div className="adder">
            <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Ajouter une candidate au comparateur">
              <option value="">Ajouter une candidate…</option>
              {others.map((c) => <option key={c.id} value={c.id}>{c.region} — {c.nom}</option>)}
            </select>
            <button className="btn" disabled={!adding} onClick={() => { cmp.add(adding); setAdding(""); }}>Ajouter</button>
          </div>
        )}
      </div>
      <div className="filters tight" role="group" aria-label="Type de photo">
        {TABS.map(([k, l]) => <button key={k} className={`chip${tab === k ? " on" : ""}`} onClick={() => { setTab(k); setKs({}); }}>{l}</button>)}
      </div>

      <div className="cmp-cols" style={{ "--n": sel.length }}>
        {sel.map((c, n) => {
          const ph = photosOf(app, c, tab);
          const k = Math.min(ks[c.id] || 0, Math.max(0, ph.length - 1));
          const p = ph[k];
          const pos = t.picks.indexOf(c.id);
          const setK = (v) => setKs({ ...ks, [c.id]: (v + ph.length) % ph.length });
          return (
            <article key={c.id} className="cmp-col in" style={{ animationDelay: `${n * 70}ms` }}>
              <div className="cmp-photo" {...dnd.handle(c.id)}>
                {p ? (
                  <button className="cmp-img" onClick={() => setZoom({ c, ph, k })} aria-label={`Zoomer sur la photo de ${c.nom}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img key={p.id} src={p.url} alt="" className="fadein" draggable={false} />
                  </button>
                ) : <div className="cmp-none">Pas de photo « {TYPE_LABEL[tab]?.toLowerCase() || tab} » vérifiée</div>}
                {ph.length > 0 && <span className="counter">{k + 1}/{ph.length}</span>}
                {pos >= 0 && <span className="pick on static">{pos + 1}</span>}
              </div>
              {ph.length > 1 && (
                <div className="cmp-arrows">
                  <button className="icon" onClick={() => setK(k - 1)} aria-label={`Photo précédente de ${c.nom}`}><I d="M15 6l-6 6 6 6" /></button>
                  <button className="icon" onClick={() => setK(k + 1)} aria-label={`Photo suivante de ${c.nom}`}><I d="M9 6l6 6-6 6" /></button>
                </div>
              )}
              <Link href={`/candidate/${c.id}`} className="card-text">
                <span className="region">{c.region}</span>
                <span className="name">{c.nom}</span>
              </Link>
              <div className="cmp-actions">
                {t.editable && (pos >= 0
                  ? <button className="btn small-btn outline" onClick={() => t.toggle(c.id)}>N° {pos + 1} · Retirer</button>
                  : <button className="btn small-btn primary" disabled={t.full} onClick={() => t.toggle(c.id)}>+ Top 5</button>)}
                <button className="link small" onClick={() => cmp.remove(c.id)}>Retirer du comparateur</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="cmp-table">
        {rows.map(([label, get, fmt, best]) => {
          const vals = sel.map(get);
          const nums = vals.filter((v) => v != null && !Number.isNaN(v));
          const b = best === "max" ? Math.max(...nums) : best === "min" ? Math.min(...nums) : null;
          return (
            <div key={label} className="cmp-row" style={{ "--n": sel.length }}>
              <span className="cmp-label">{label}</span>
              {vals.map((v, n) => <span key={n} className={best && sel.length > 1 && v === b ? "best" : ""}>{fmt(v)}</span>)}
            </div>
          );
        })}
      </div>
      <p className="small muted">En doré : la meilleure valeur. Les photos restent dans la même catégorie pour comparer à égalité ; touche une photo pour zoomer.</p>
      {zoom && <Zoom c={zoom.c} photos={zoom.ph} start={zoom.k} onClose={() => setZoom(null)} />}
    </div>
  );
}
