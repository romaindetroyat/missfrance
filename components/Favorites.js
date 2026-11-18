"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useApp } from "@/app/providers";
import { useLikes, LikeButton } from "./Likes";
import { sized, onImgError } from "@/lib/img";

// Carrousel « Coups de cœur des joueurs » : les photos les plus aimées, toutes candidates confondues.
export default function Favorites({ max = 30 }) {
  const app = useApp();
  const likes = useLikes();
  const [open, setOpen] = useState(-1);
  const byPhoto = new Map(app.photos.map((p) => [p.id, p]));
  const liked = Object.entries(likes.map || {})
    .filter(([, v]) => v.n > 0)
    .map(([id, v]) => ({ p: byPhoto.get(Number(id)), n: v.n }))
    .filter((x) => x.p && app.byId[x.p.candidate_id])
    .sort((a, b) => b.n - a.n || b.p.id - a.p.id)
    .slice(0, max);
  // Tant qu'il y a peu de coups de cœur : des photos à découvrir (une par candidate, tirées au hasard), à aimer directement
  const [seed] = useState(() => Math.random());
  const discover = liked.length >= 8 ? [] : (() => {
    const taken = new Set(liked.map((x) => x.p.id));
    const out = [];
    for (const c of app.candidates) {
      const pool = (app.photosBy[c.id] || []).filter((p) => ["portrait", "maillot", "election"].includes(p.type) && !taken.has(p.id));
      if (pool.length) out.push({ p: pool[Math.floor(((seed * 9301 + c.id.length * 49297) % 1) * pool.length) % pool.length], n: 0 });
    }
    return out.sort((a, b) => ((a.p.id * seed) % 1) - ((b.p.id * seed) % 1)).slice(0, max - liked.length);
  })();
  const list = [...liked, ...discover];
  if (!list.length) return null;

  return (
    <section className="favs" aria-label="Coups de cœur des joueurs">
      <h2 className="sec-title">♥ Coups de cœur des joueurs</h2>
      {liked.length < 8 && (
        <p className="muted small favs-hint">
          {liked.length ? "Les photos les plus aimées passent en tête. " : "Pas encore de coup de cœur. "}
          Touche le ♥ des photos que tu préfères : elles apparaîtront ici pour tout le monde.
        </p>
      )}
      <div className="favs-strip">
        {list.map(({ p }, i) => {
          const c = app.byId[p.candidate_id];
          return (
            <button key={p.id} type="button" className="fav-card in" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }} onClick={() => setOpen(i)} aria-label={`Photo de ${c.nom}, ${likes.count(p.id)} j'aime`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(p.url, 360)} onError={onImgError(p.url)} alt="" loading="lazy" />
              <span className="fav-info"><span className="fav-region">{c.region}</span><span className="fav-name">{c.nom}</span></span>
              <LikeButton photo={p} inside className="fav-heart" />
            </button>
          );
        })}
      </div>
      {open >= 0 && <FavViewer list={list.map((x) => x.p)} start={open} onClose={() => setOpen(-1)} />}
    </section>
  );
}

// Plein écran sur la sélection des coups de cœur
function FavViewer({ list, start, onClose }) {
  const app = useApp();
  const [idx, setIdx] = useState(start);
  const track = useRef(null);
  useEffect(() => { track.current?.children[start]?.scrollIntoView({ inline: "center", block: "nearest" }); }, [start]);
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [onClose]);
  const go = (i) => { const n = Math.max(0, Math.min(list.length - 1, i)); track.current?.children[n]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); setIdx(n); };
  const onScroll = () => { const el = track.current; if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth)); };
  const cur = list[idx], c = cur && app.byId[cur.candidate_id];
  return createPortal(
    <div className="pv" role="dialog" aria-modal="true" aria-label="Coups de cœur des joueurs">
      <div className="pv-bar">
        <span className="pv-who">
          <span className="pv-region">{c ? `Miss ${c.region}` : ""}</span>
          <strong>{c?.nom}</strong>
        </span>
        <button className="pv-close" onClick={onClose} aria-label="Fermer">×</button>
      </div>
      <div className="pv-track" ref={track} onScroll={onScroll}>
        {list.map((p, i) => (
          <div key={p.id} className="pv-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sized(p.url, 1000)} onError={onImgError(p.url)} alt="" loading={Math.abs(i - idx) < 3 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <>
          <button className="pv-nav prev" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Photo précédente">‹</button>
          <button className="pv-nav next" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1} aria-label="Photo suivante">›</button>
        </>
      )}
      <div className="pv-foot">
        <span>♥ Coup de cœur {idx + 1} / {list.length}</span>
        <LikeButton photo={cur} className="pv-like" />
        {c && <Link href={`/candidate/${c.id}`} className="pv-link" onClick={onClose}>Voir sa fiche</Link>}
      </div>
    </div>,
    document.body
  );
}
