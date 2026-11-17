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
