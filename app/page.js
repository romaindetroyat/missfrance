"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./providers";
import { cote } from "@/components/Bits";
import Top5Panel from "@/components/Top5Panel";
import { PHOTO_TYPES, featured } from "@/lib/photos";
import { useTop5 } from "@/lib/top5";
import { useCompare } from "@/lib/compare";
import { useDrag } from "@/components/Drag";

const SORTS = {
  region: ["Région", (a, b) => a.region.localeCompare(b.region, "fr")],
  cote: ["Favorites", (a, b) => (a.cote ?? 99) - (b.cote ?? 99)],
  outsiders: ["Outsiders", (a, b) => (b.cote ?? 0) - (a.cote ?? 0)],
};
const Plus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);

export default function Home() {
  const app = useApp();
  const t = useTop5();
  const cmp = useCompare();
  const dnd = useDrag();
  const [sort, setSort] = useState("region");
  const [ptype, setPtype] = useState("officiel");
  const list = [...app.candidates].sort(SORTS[sort][1]);

  return (
    <div className="home">
      <section className="home-main">
        <div className="head">
          <h1>Les {app.candidates.length} candidates</h1>
          <div className="seg" role="group" aria-label="Tri">
            {Object.entries(SORTS).map(([k, [label]]) => (
              <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="filters" role="group" aria-label="Photo mise en avant">
          {PHOTO_TYPES.map(([k, label]) => {
            const n = app.candidates.filter((c) => (app.photosBy[c.id] || []).some((p) => p.type === k)).length;
            return (
              <button key={k} className={`chip${ptype === k ? " on" : ""}`} onClick={() => setPtype(k)} disabled={!n && k !== "officiel"}>
                {label} {k !== "officiel" && <span className="count">{n}</span>}
              </button>
            );
          })}
        </div>
        {cmp.ids.length > 0 && (
          <p className="hint first">{cmp.ids.length} candidate{cmp.ids.length > 1 ? "s" : ""} à comparer · <a href="/comparer">Ouvrir le comparateur</a> · <a href="/defile">Lancer le défilé</a></p>
        )}
        {t.editable && t.picks.length === 0 && (
          <p className="hint first">Touche <span className="plus-demo"><Plus /></span> sur une photo, ou glisse-la vers ton Top 5 (appui long sur mobile), pour l'ajouter dans l'ordre de tes préférences.</p>
        )}
        <div className="grid" key={sort}>
          {list.map((c, i) => {
            const { url: src, fallback } = featured(c, app.photosBy[c.id], ptype);
            const pos = t.picks.indexOf(c.id);
            const n = app.photosBy[c.id]?.length || 0;
            return (
              <article key={c.id} className="card in" style={{ animationDelay: `${Math.min(i, 20) * 35}ms` }}>
                <div className={`card-img${dnd?.drag?.id === c.id ? " lifted" : ""}`} {...dnd.handle(c.id)}>
                  <Link href={`/candidate/${c.id}`} className="card-link" draggable={false} aria-label={`Voir la fiche et les photos de ${c.nom}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {src ? <img key={src} src={src} alt="" loading="lazy" className="fadein" draggable={false} /> : <span className="placeholder" />}
                  </Link>
                  {n > 0 && <span className="pill">{n} photo{n > 1 ? "s" : ""}</span>}
                  {fallback && <span className="pill soft">Portrait</span>}
                  <button className={`cmp-toggle${cmp.has(c.id) ? " on" : ""}`} onClick={() => cmp.toggle(c.id)} aria-pressed={cmp.has(c.id)} aria-label={cmp.has(c.id) ? `Retirer ${c.nom} du comparateur` : `Comparer ${c.nom}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h7v14H3zM14 5h7v14h-7z" /></svg>
                  </button>
                  {t.editable ? (
                    pos >= 0 ? (
                      <button key="on" className="pick on pop" onClick={() => t.toggle(c.id)} aria-label={`Retirer ${c.nom} de mon Top 5 (n° ${pos + 1})`}>{pos + 1}</button>
                    ) : (
                      <button key="off" className="pick" onClick={() => t.toggle(c.id)} aria-label={`Ajouter ${c.nom} à mon Top 5`} disabled={t.full}><Plus /></button>
                    )
                  ) : (
                    pos >= 0 && <span className="pick on">{pos + 1}</span>
                  )}
                </div>
                <Link href={`/candidate/${c.id}`} className="card-text">
                  <span className="region">{c.region}</span>
                  <span className="name">{c.nom}</span>
                  <span className="meta">
                    Cote {cote(c)}
                    {c.age ? ` · ${c.age} ans` : ""}
                    {c.taille_cm ? ` · ${(c.taille_cm / 100).toFixed(2).replace(".", ",")} m` : ""}
                  </span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="home-side" aria-label="Mon Top 5">
        <Top5Panel t={t} />
      </aside>
    </div>
  );
}
