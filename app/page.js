"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./providers";
import { cote, portraitOf } from "@/components/Bits";
import { useDraft } from "@/lib/draft";

const SORTS = {
  region: ["Région", (a, b) => a.region.localeCompare(b.region, "fr")],
  cote: ["Favorites", (a, b) => (a.cote ?? 99) - (b.cote ?? 99)],
  outsiders: ["Outsiders", (a, b) => (b.cote ?? 0) - (a.cote ?? 0)],
};

export default function Home() {
  const app = useApp();
  const [sort, setSort] = useState("region");
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
      <div className="grid">
        {list.map((c) => {
          const src = portraitOf(app, c);
          const pos = picks.indexOf(c.id);
          const n = app.photosBy[c.id]?.length || 0;
          return (
            <Link key={c.id} href={`/candidate/${c.id}`} className="card">
              <div className="card-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img src={src} alt={`Portrait de ${c.nom}`} loading="lazy" /> : <span className="placeholder" />}
                {pos >= 0 && <span className="badge">N° {pos + 1}</span>}
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
