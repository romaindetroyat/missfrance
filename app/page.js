"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./providers";
import { cote } from "@/components/Bits";
import { PHOTO_TYPES, featured } from "@/lib/photos";
import { useDraft } from "@/lib/draft";

const SORTS = {
  region: ["Région", (a, b) => a.region.localeCompare(b.region, "fr")],
  cote: ["Favorites", (a, b) => (a.cote ?? 99) - (b.cote ?? 99)],
  outsiders: ["Outsiders", (a, b) => (b.cote ?? 0) - (a.cote ?? 0)],
};

export default function Home() {
  const app = useApp();
  const [sort, setSort] = useState("region");
  const [ptype, setPtype] = useState("officiel");
  const { picks } = useDraft(app.email, app.myPrediction);
  const list = [...app.candidates].sort(SORTS[sort][1]);

  return (
    <>
      <div className="head">
        <h1>Les {app.candidates.length} candidates</h1>
        <div className="seg" role="group" aria-label="Tri">
          {Object.entries(SORTS).map(([k, [label]]) => (
            <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="filters" role="group" aria-label="Photo mise en avant">
        <span className="muted small">Photos :</span>
        {PHOTO_TYPES.map(([k, label]) => {
          const n = app.candidates.filter((c) => (app.photosBy[c.id] || []).some((p) => p.type === k)).length;
          return (
            <button key={k} className={`chip${ptype === k ? " on" : ""}`} onClick={() => setPtype(k)} disabled={!n && k !== "officiel"}>
              {label} {k !== "officiel" && <span className="count">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="grid">
        {list.map((c) => {
          const { url: src, fallback } = featured(c, app.photosBy[c.id], ptype);
          const pos = picks.indexOf(c.id);
          const n = app.photosBy[c.id]?.length || 0;
          return (
            <Link key={c.id} href={`/candidate/${c.id}`} className="card">
              <div className="card-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img src={src} alt={`Portrait de ${c.nom}`} loading="lazy" /> : <span className="placeholder" />}
                {pos >= 0 && <span className="badge">N° {pos + 1}</span>}
                {fallback && <span className="badge soft">Portrait</span>}
              </div>
              <span className="region">{c.region}</span>
              <span className="name">{c.nom}</span>
              <span className="meta">
                {[c.age && `${c.age} ans`, c.taille_cm && `${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m`, n && `${n} photo${n > 1 ? "s" : ""}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="meta">Cote {cote(c)}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
