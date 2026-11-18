"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/app/providers";
import { cote, Trend } from "@/components/Bits";
import profiles from "@/data/profiles.json";
import { PHOTO_TYPES, TYPE_LABEL } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import { useTop5 } from "@/lib/top5";
import RankPicker from "@/components/RankPicker";
import { sized, onImgError } from "@/lib/img";
import { createPortal } from "react-dom";

const FIELDS = [
  ["ville", "Ville"],
  ["departement", "Département"],
  ["etudes_profession", "Études / métier"],
  ["date_naissance", "Naissance"],
  ["couleur_cheveux", "Cheveux"],
  ["couleur_yeux", "Yeux"],
  ["date_election_regionale", "Élection régionale"],
  ["lieu_election_regionale", "Lieu de l'élection"],
  ["dauphine_ou_titres_precedents", "Parcours"],
  ["passions", "Passions"],
  ["cause_defendue", "Cause défendue"],
];
const show = (v) => (Array.isArray(v) ? v.join(", ") : String(v));
const Chevron = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

export default function Candidate() {
  const app = useApp();
  const t = useTop5();
  const { id } = useParams();
  const c = app.byId[id];
  const all = app.photosBy[id] || [];
  const [ptype, setPtype] = useState("tout");
  const [mode, setMode] = useState("slides"); // slides | mosaic
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const photos = ptype === "tout" ? all : all.filter((p) => p.type === ptype);
  const track = useRef(null);
  const thumbs = useRef(null);

  // Défilement du diaporama (glisser au doigt, flèches, vignettes, clavier)
  const go = useCallback((i, smooth = true) => {
    const el = track.current;
    if (!el || !photos.length) return;
    const n = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setIdx(n);
  }, [photos.length]);
  const onScroll = () => {
    const el = track.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  useEffect(() => { setIdx(0); track.current?.scrollTo({ left: 0 }); }, [ptype]);
  useEffect(() => {
    thumbs.current?.children[idx]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [idx]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea,select")) return;
      if (e.key === "Escape") setZoom(false);
      if (mode !== "slides" && !zoom) return;
      if (e.key === "ArrowRight") { e.preventDefault(); zoom ? setIdx((i) => Math.min(photos.length - 1, i + 1)) : go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); zoom ? setIdx((i) => Math.max(0, i - 1)) : go(idx - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, idx, mode, zoom, photos.length]);
  useEffect(() => { if (!zoom && mode === "slides") go(idx, false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, mode]);

  if (!c) return <p>Candidate introuvable. <Link href="/">Retour à la liste</Link></p>;

  const d = { ...(c.details || {}), ...(profiles[c.id] || {}) };
  const pos = t.picks.indexOf(c.id);
  const ig = d.instagram?.identifiant || (typeof d.instagram === "string" ? d.instagram : null);
  const pct = (p) => (p != null ? `${(Number(p) * 100).toFixed(1).replace(".", ",")} %` : "—");
  const cur = photos[idx];

  async function hide(p) {
    if (!confirm("Masquer cette photo pour tout le monde (mauvaise personne, mauvaise qualité) ?")) return;
    const { error } = await supabase.from("photos").update({ hidden: true }).eq("id", p.id);
    if (error) return alert("Impossible de masquer la photo : " + error.message);
    setZoom(false);
    app.reload();
  }

  return (
    <article className="profile">
      <Link href="/" className="back">← Toutes les candidates</Link>

      <div className="profile-layout">
        {/* Photos */}
        <section className="viewer" aria-label={`Photos de ${c.nom}`}>
          <div className="viewer-bar">
            <div className="filters tight" role="group" aria-label="Type de photo">
              <button className={`chip${ptype === "tout" ? " on" : ""}`} onClick={() => setPtype("tout")}>
                Toutes <span className="count">{all.length}</span>
              </button>
              {PHOTO_TYPES.map(([k, label]) => {
                const n = all.filter((p) => p.type === k).length;
                return n ? (
                  <button key={k} className={`chip${ptype === k ? " on" : ""}`} onClick={() => setPtype(k)}>
                    {label} <span className="count">{n}</span>
                  </button>
                ) : null;
              })}
            </div>
            {photos.length > 1 && (
              <div className="seg small" role="group" aria-label="Affichage des photos">
                <button className={mode === "slides" ? "on" : ""} onClick={() => setMode("slides")}>Diaporama</button>
                <button className={mode === "mosaic" ? "on" : ""} onClick={() => setMode("mosaic")}>Toutes</button>
              </div>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="stage empty"><p className="muted">Pas encore de photo de ce type. La collecte tourne tous les 3 jours.</p></div>
          ) : mode === "slides" ? (
            <>
              <div className="stage">
                <div className="track" ref={track} onScroll={onScroll}>
                  {photos.map((p, i) => (
                    <button key={p.id} className="slide" onClick={() => { setIdx(i); setZoom(true); }} aria-label={`Agrandir la photo ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sized(p.url, 1000)} onError={onImgError(p.url)} alt={p.caption || `${c.nom}, photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} />
                    </button>
                  ))}
                </div>
                <span className="counter">{idx + 1} / {photos.length}</span>
                {cur && TYPE_LABEL[cur.type] && <span className="tag">{TYPE_LABEL[cur.type]}</span>}
                {photos.length > 1 && (
                  <>
                    <button className="arrow left" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Photo précédente"><Chevron dir="left" /></button>
                    <button className="arrow right" onClick={() => go(idx + 1)} disabled={idx === photos.length - 1} aria-label="Photo suivante"><Chevron dir="right" /></button>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="thumbs" ref={thumbs}>
                  {photos.map((p, i) => (
                    <button key={p.id} className={i === idx ? "on" : ""} onClick={() => go(i)} aria-label={`Voir la photo ${i + 1}`} aria-current={i === idx}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sized(p.url, 400)} onError={onImgError(p.url)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {cur && (
                <p className="credit">
                  {cur.credit ? `© ${cur.credit}` : ""}
                  {cur.source_page && <> · <a href={cur.source_page} target="_blank" rel="noreferrer">source</a></>}
                  {app.me?.is_admin && <> · <button className="link" onClick={() => hide(cur)}>masquer</button></>}
                </p>
              )}
            </>
          ) : (
            <div className="mosaic">
              {photos.map((p, i) => (
                <button key={p.id} className="in" style={{ animationDelay: `${Math.min(i, 24) * 20}ms` }} onClick={() => { setIdx(i); setMode("slides"); }} aria-label={`Voir la photo ${i + 1} en grand`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sized(p.url, 400)} onError={onImgError(p.url)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Infos */}
        <section className="info">
          <p className="region">{c.region}</p>
          <h1>{c.nom}</h1>
          <p className="meta">
            {[c.age && `${c.age} ans`, c.taille_cm && `${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m`, c.ville, `${all.length} photos`].filter(Boolean).join(" · ")}
          </p>

          <dl className="stats">
            <div><dt>Cote</dt><dd>{cote(c)}</dd></div>
            <div><dt>Top 5</dt><dd>{pct(c.p_top5)} <Trend c={c} /></dd></div>
            <div><dt>Victoire</dt><dd>{pct(c.p_victoire)}</dd></div>
          </dl>
          {c.bonus_note && (
            <details className="why" open>
              <summary>Pourquoi cette cote ?</summary>
              <ul>
                <li>Base historique (taille, résultats du comité régional, région hôte) : score {Number(c.score_base ?? 0).toFixed(2).replace(".", ",")}</li>
                {c.bonus_note.split(" ; ").map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </details>
          )}

          {(d.bio || c.bio) && <p className="bio">{d.bio || c.bio}</p>}

          <dl className="facts">
            {FIELDS.filter(([k]) => d[k] != null && d[k] !== "" && !(Array.isArray(d[k]) && !d[k].length)).map(([k, label]) => (
              <div key={k}><dt>{label}</dt><dd>{show(d[k])}</dd></div>
            ))}
            {ig && (
              <div>
                <dt>Instagram</dt>
                <dd><a href={`https://www.instagram.com/${ig.replace(/^@/, "")}/`} target="_blank" rel="noreferrer">@{ig.replace(/^@/, "")}</a></dd>
              </div>
            )}
          </dl>

          {d.faits_notables?.length > 0 && (
            <>
              <h2>À retenir</h2>
              <ul className="notes">{d.faits_notables.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </>
          )}

          {d.sources?.length > 0 && (
            <p className="sources">
              Sources :{" "}
              {d.sources.map((s, i) => {
                let host = s;
                try { host = new URL(s).hostname.replace(/^www\./, ""); } catch {}
                return <span key={i}>{i > 0 && ", "}<a href={s} target="_blank" rel="noreferrer">{host}</a></span>;
              })}
            </p>
          )}
        </section>
      </div>

      {/* Choix du rang, toujours à portée de pouce */}
      {t.editable && (
        <div className="cta-bar">
          <div className="cta-card">
            <span className="small">{pos >= 0 ? `${t.RANK_NAMES[pos]} dans ${t.phase === "adjust" ? "mes ajustements" : "mon Top 5"}` : "Quelle place pour elle ?"}</span>
            <RankPicker t={t} id={c.id} />
          </div>
        </div>
      )}

      {zoom && cur && typeof document !== "undefined" && createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={cur.id} className="fadein" src={cur.url} alt={cur.caption || `${c.nom}, photo ${idx + 1}`} onClick={(e) => e.stopPropagation()} />
          <p onClick={(e) => e.stopPropagation()}>
            {idx + 1} / {photos.length}
            {TYPE_LABEL[cur.type] ? ` · ${TYPE_LABEL[cur.type]}` : ""}
            {cur.credit ? ` · © ${cur.credit}` : ""}
            {cur.source_page && <> · <a href={cur.source_page} target="_blank" rel="noreferrer">Source</a></>}
          </p>
          {app.me?.is_admin && <button className="hide" onClick={(e) => { e.stopPropagation(); hide(cur); }}>Masquer</button>}
          {photos.length > 1 && (
            <>
              <button className="nav prev" aria-label="Photo précédente" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); setIdx(idx - 1); }}><Chevron dir="left" /></button>
              <button className="nav next" aria-label="Photo suivante" disabled={idx === photos.length - 1} onClick={(e) => { e.stopPropagation(); setIdx(idx + 1); }}><Chevron dir="right" /></button>
            </>
          )}
          <button className="close" aria-label="Fermer" onClick={() => setZoom(false)}>×</button>
        </div>,
        document.body
      )}
    </article>
  );
}
