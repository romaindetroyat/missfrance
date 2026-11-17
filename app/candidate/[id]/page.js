"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";
import { cote } from "@/components/Bits";
import { useDraft } from "@/lib/draft";
import profiles from "@/data/profiles.json";
import { PHOTO_TYPES, TYPE_LABEL } from "@/lib/photos";
import { supabase } from "@/lib/supabase";

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

export default function Candidate() {
  const app = useApp();
  const { id } = useParams();
  const c = app.byId[id];
  const all = app.photosBy[id] || [];
  const [ptype, setPtype] = useState("tout");
  const photos = ptype === "tout" ? all : all.filter((p) => p.type === ptype);
  const [open, setOpen] = useState(null);
  const { picks, update } = useDraft(app.email, app.myPrediction);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!c) return <p>Candidate introuvable. <Link href="/">Retour à la liste</Link></p>;

  const d = { ...(c.details || {}), ...(profiles[c.id] || {}) };
  const pos = picks.indexOf(c.id);
  const ig = d.instagram?.identifiant || (typeof d.instagram === "string" ? d.instagram : null);
  const pct = (p) => (p != null ? `${(Number(p) * 100).toFixed(1).replace(".", ",")} %` : "—");

  return (
    <article className="profile">
      <Link href="/" className="back">← Toutes les candidates</Link>
      <div className="profile-head">
        <div>
          <p className="region">{c.region}</p>
          <h1>{c.nom}</h1>
          <p className="meta">
            {[c.age && `${c.age} ans`, c.taille_cm && `${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m`, c.ville].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!app.locked &&
          (pos >= 0 ? (
            <button className="btn" onClick={() => update(picks.filter((p) => p !== c.id))}>
              Retirer de mon Top 5 (n° {pos + 1})
            </button>
          ) : (
            <button className="btn primary" disabled={picks.length >= 5} onClick={() => update([...picks, c.id])}>
              {picks.length >= 5 ? "Top 5 complet" : "Ajouter à mon Top 5"}
            </button>
          ))}
      </div>
      {pos >= 0 && !app.locked && (
        <p className="hint">Dans ton brouillon. <Link href="/prono">Ordonner et enregistrer mon Top 5</Link></p>
      )}

      <dl className="stats">
        <div><dt>Cote</dt><dd>{cote(c)}</dd></div>
        <div><dt>Top 5 (modèle)</dt><dd>{pct(c.p_top5)}</dd></div>
        <div><dt>Victoire (modèle)</dt><dd>{pct(c.p_victoire)}</dd></div>
      </dl>

      {c.bonus_note && <p className="hint">Signaux pris en compte dans la cote : {c.bonus_note}.</p>}
      {(d.bio || c.bio) && <p className="bio">{d.bio || c.bio}</p>}

      <dl className="facts">
        {FIELDS.filter(([k]) => d[k] != null && d[k] !== "" && !(Array.isArray(d[k]) && !d[k].length)).map(([k, label]) => (
          <div key={k}><dt>{label}</dt><dd>{show(d[k])}</dd></div>
        ))}
        {ig && (
          <div>
            <dt>Instagram</dt>
            <dd>
              <a href={`https://www.instagram.com/${ig.replace(/^@/, "")}/`} target="_blank" rel="noreferrer">@{ig.replace(/^@/, "")}</a>
              {d.instagram?.abonnes ? ` · ${Number(d.instagram.abonnes).toLocaleString("fr-FR")} abonnés` : ""}
            </dd>
          </div>
        )}
      </dl>

      {d.faits_notables?.length > 0 && (
        <>
          <h2>À retenir</h2>
          <ul className="notes">{d.faits_notables.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </>
      )}

      <h2>Photos {all.length > 0 && <span className="muted">({all.length})</span>}</h2>
      {all.length > 0 && (
        <div className="filters" role="group" aria-label="Type de photo">
          <button className={`chip${ptype === "tout" ? " on" : ""}`} onClick={() => { setPtype("tout"); setOpen(null); }}>Toutes</button>
          {PHOTO_TYPES.map(([k, label]) => {
            const n = all.filter((p) => p.type === k).length;
            return n ? (
              <button key={k} className={`chip${ptype === k ? " on" : ""}`} onClick={() => { setPtype(k); setOpen(null); }}>
                {label} <span className="count">{n}</span>
              </button>
            ) : null;
          })}
        </div>
      )}
      {photos.length === 0 ? (
        <p className="muted">Pas encore de photo. La collecte tourne tous les 3 jours.</p>
      ) : (
        <div className="gallery">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setOpen(i)} aria-label={`Agrandir la photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${c.nom}, photo ${i + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
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

      {open != null && photos[open] && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[open].url} alt={`${c.nom}, photo ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          <p onClick={(e) => e.stopPropagation()}>
            {open + 1} / {photos.length}
            {TYPE_LABEL[photos[open].type] ? ` · ${TYPE_LABEL[photos[open].type]}` : ""}
            {photos[open].credit ? ` · © ${photos[open].credit}` : ""}
            {photos[open].source_page && (
              <> · <a href={photos[open].source_page} target="_blank" rel="noreferrer">Source</a></>
            )}
          </p>
          {app.me?.is_admin && (
            <button className="hide" onClick={async (e) => {
              e.stopPropagation();
              if (!confirm("Masquer cette photo pour tout le monde (mauvaise personne, mauvaise qualité) ?")) return;
              const { error } = await supabase.from("photos").update({ hidden: true }).eq("id", photos[open].id);
              if (error) return alert("Impossible de masquer la photo : " + error.message);
              setOpen(null);
              app.reload();
            }}>Masquer</button>
          )}
          {photos.length > 1 && (
            <>
              <button className="nav prev" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }}>‹</button>
              <button className="nav next" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }}>›</button>
            </>
          )}
          <button className="close" aria-label="Fermer" onClick={() => setOpen(null)}>×</button>
        </div>
      )}
    </article>
  );
}
