"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/providers";
import { supabase } from "@/lib/supabase";
import Login from "./Login";
import ToastProvider from "./Toast";
import Top5Dock from "./Top5Dock";
import DragProvider from "./Drag";
import Logo from "./Logo";
import Share from "./Share";
import Decor from "./Decor";
import Tour, { startTour } from "./Tour";

const LINKS = [
  ["/", "Candidates"],
  ["/defile", "Défilé"],
  ["/duel", "Duel"],
  ["/comparer", "Comparer"],
  ["/prono", "Mon Top 5"],
  ["/joueurs", "Joueurs"],
  ["/ia", "Pronos de l'IA"],
];

export function countdown(target, now) {
  const ms = target - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export default function Shell({ children }) {
  const app = useApp();
  const path = usePathname();

  if (app.session === undefined) return <p className="center muted">Chargement…</p>;
  if (!app.session) return <Login />;
  if (app.error)
    return (
      <main className="center">
        <p>Les données n'ont pas pu être chargées.</p>
        <button className="btn" onClick={app.reload}>Réessayer</button>
      </main>
    );
  if (app.loading) return <p className="center muted">Chargement…</p>;
  if (!app.me)
    return (
      <main className="center">
        <p>L'adresse {app.email} n'est pas sur la liste des invités.</p>
        <p className="muted">Demande à un ami déjà inscrit de t'inviter depuis la page Joueurs, avec cette adresse.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Changer d'adresse</button>
      </main>
    );

  const left = app.lockAt ? countdown(app.lockAt, app.now) : null;
  const leftAdjust = app.adjustUntil ? countdown(app.adjustUntil, app.now) : null;
  const links = app.me.is_admin ? [...LINKS, ["/admin", "Résultats"]] : LINKS;

  return (
    <>
      <Decor />
      <header className="top">
        <div className="wrap bar">
          <Link href="/" className="brand-link" aria-label="Miss France 2027, accueil">
            <Logo />
            <span className="brand-stack">
              <span className="brand">Miss France</span>
              <span className="brand-sub">Pronos 2027</span>
            </span>
          </Link>
          <nav>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? "active" : ""}>
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" className="tour-btn" onClick={startTour} aria-label="Visite guidée : comment ça marche ?" data-tip="Comment ça marche ?">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></svg>
            <span>Visite guidée</span>
          </button>
        </div>
        <div className="wrap status">
          <span>
            {app.results
              ? "Résultats publiés"
              : left
              ? `Pronostics ouverts — verrouillage dans ${left}`
              : leftAdjust
              ? `Cérémonie en cours — ajustements possibles encore ${leftAdjust}`
              : "Pronostics verrouillés"}
          </span>
          <span className="who">
            {app.me.display_name} · <Share /> ·{" "}
            <button className="link" onClick={() => supabase.auth.signOut()}>Quitter</button>
          </span>
        </div>
      </header>
      <ToastProvider>
        <DragProvider>
          <main className="wrap page" key={path}>{children}</main>
          <Tour />
          {!["/prono", "/admin", "/admin/instagram", "/defile"].includes(path) && <Top5Dock />}
        </DragProvider>
      </ToastProvider>
    </>
  );
}
