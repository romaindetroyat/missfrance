"use client";
import Link from "next/link";
import { useApp } from "@/app/providers";

export const cote = (c) => (c?.cote != null ? Number(c.cote).toFixed(1).replace(".", ",") : "—");

export function portraitOf(app, c) {
  return c.portrait_url || app.photosBy[c.id]?.[0]?.url || null;
}

export function Thumb({ c, size = 56 }) {
  const app = useApp();
  const src = portraitOf(app, c);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="thumb" src={src} alt="" width={size} height={size} loading="lazy" />
  ) : (
    <span className="thumb placeholder" style={{ width: size, height: size }} aria-hidden />
  );
}

export function CandidateRow({ id, rank, right }) {
  const app = useApp();
  const c = app.byId[id];
  if (!c) return null;
  return (
    <div className="row">
      {rank != null && <span className="rank">{rank}</span>}
      <Thumb c={c} />
      <Link href={`/candidate/${c.id}`} className="row-main">
        <span className="region">{c.region}</span>
        <span className="name">{c.nom}</span>
      </Link>
      {right}
    </div>
  );
}

// Évolution des chances de Top 5 depuis le dernier recalcul (collecte tous les 3 jours)
export function Trend({ c }) {
  const t = Number(c?.trend);
  if (!t || Math.abs(t) < 0.01) return null;
  const up = t > 0;
  return (
    <span className={`trend ${up ? "up" : "down"}`} title={`Chances de Top 5 ${up ? "en hausse" : "en baisse"} de ${Math.abs(Math.round(t * 100))} points depuis le dernier calcul`}>
      {up ? "↑" : "↓"} {Math.abs(Math.round(t * 100))}
    </span>
  );
}
