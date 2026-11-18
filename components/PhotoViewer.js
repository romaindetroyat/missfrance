"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useApp } from "@/app/providers";
import { PHOTO_TYPES, TYPE_LABEL } from "@/lib/photos";
import { sized, onImgError } from "@/lib/img";
import { LikeButton, useLikes } from "./Likes";

// Visionneuse plein écran des photos d'une candidate (depuis Mon Top 5, les listes de joueurs…) :
// on fait défiler du doigt, filtre par rubrique, lien vers la fiche complète.
export default function PhotoViewer({ c, onClose }) {
  const app = useApp();
  const all = app.photosBy[c.id]?.length ? app.photosBy[c.id] : c.portrait_url ? [{ id: "p", url: c.portrait_url, type: "officiel" }] : [];
  const [type, setType] = useState("tout");
  const likes = useLikes();
  const loved = all.filter((p) => likes.count(p.id) > 0).sort((a, b) => likes.count(b.id) - likes.count(a.id));
  const photos = type === "tout" ? all : type === "likes" ? loved : all.filter((p) => p.type === type);
  const [idx, setIdx] = useState(0);
  const track = useRef(null);

  const go = (i) => {
    const n = Math.max(0, Math.min(photos.length - 1, i));
    track.current?.children[n]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setIdx(n);
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(idx + 1); if (e.key === "ArrowLeft") go(idx - 1); };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  });
  useEffect(() => { setIdx(0); track.current?.scrollTo({ left: 0 }); }, [type]);

  const cur = photos[idx];
  const counts = Object.fromEntries(PHOTO_TYPES.map(([k]) => [k, all.filter((p) => p.type === k).length]));

  return createPortal(
    <div className="pv" role="dialog" aria-modal="true" aria-label={`Photos de ${c.nom}`}>
      <div className="pv-bar">
        <span className="pv-who">
          <span className="pv-region">Miss {c.region}</span>
          <strong>{c.nom}</strong>
        </span>
        <button className="pv-close" onClick={onClose} aria-label="Fermer">×</button>
      </div>
      <div className="pv-chips" role="group" aria-label="Type de photo">
        <button className={type === "tout" ? "on" : ""} onClick={() => setType("tout")}>Toutes {all.length}</button>
        {loved.length > 0 && <button className={type === "likes" ? "on" : ""} onClick={() => setType("likes")}>♥ Coups de cœur {loved.length}</button>}
        {PHOTO_TYPES.map(([k, label]) => counts[k] ? (
          <button key={k} className={type === k ? "on" : ""} onClick={() => setType(k)}>{label} {counts[k]}</button>
        ) : null)}
      </div>
      <div className="pv-track" ref={track} onScroll={onScroll}>
        {photos.map((p, i) => (
          <div key={p.id} className="pv-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sized(p.url, 1000)} onError={onImgError(p.url)} alt={`${c.nom}, photo ${i + 1}`} loading={Math.abs(i - idx) < 3 ? "eager" : "lazy"} />
          </div>
        ))}
        {!photos.length && <p className="pv-empty">Pas encore de photo.</p>}
      </div>
      {photos.length > 1 && (
        <>
          <button className="pv-nav prev" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Photo précédente">‹</button>
          <button className="pv-nav next" onClick={() => go(idx + 1)} disabled={idx >= photos.length - 1} aria-label="Photo suivante">›</button>
        </>
      )}
      <div className="pv-foot">
        <span>{photos.length ? `${idx + 1} / ${photos.length}` : ""}{cur && TYPE_LABEL[cur.type] ? ` · ${TYPE_LABEL[cur.type]}` : ""}</span>
        <LikeButton photo={cur} className="pv-like" />
        <Link href={`/candidate/${c.id}`} className="pv-link" onClick={onClose}>Voir sa fiche</Link>
      </div>
    </div>,
    document.body
  );
}

// Vignette cliquable qui ouvre la visionneuse
export function PhotoButton({ c, children, className = "" }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const n = app.photosBy[c.id]?.length || 0;
  return (
    <>
      <button type="button" className={`photo-btn ${className}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`Voir les ${n} photos de ${c.nom}`} data-tip="Voir ses photos">
        {children}
        {n > 1 && <span className="photo-count">{n}</span>}
      </button>
      {open && <PhotoViewer c={c} onClose={() => setOpen(false)} />}
    </>
  );
}
