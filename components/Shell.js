"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/providers";
import { supabase } from "@/lib/supabase";
import Login from "./Login";
import ToastProvider from "./Toast";
import Top5Dock from "./Top5Dock";
import DragProvider from "./Drag";

const LINKS = [
  ["/", "Candidates"],
  ["/defile", "Défilé"],
  ["/duel", "Duel"],
  ["/comparer", "Comparer"],
  ["/prono", "Mon Top 5"],
  ["/joueurs", "Joueurs"],
  ["/ia", "Pronos IA"],
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
        <button className="btn" onClick={() => supabase.auth.signOut()}>Changer d'adresse</button>
      </main>
    );

  const left = app.lockAt ? countdown(app.lockAt, app.now) : null;
  const leftAdjust = app.adjustUntil ? countdown(app.adjustUntil, app.now) : null;
  const links = app.me.is_admin ? [...LINKS, ["/admin", "Résultats"]] : LINKS;

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <Link href="/" className="brand">Miss France 2027</Link>
          <nav>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? "active" : ""}>
                {label}
              </Link>
            ))}
          </nav>
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
            {app.me.display_name} ·{" "}
            <button className="link" onClick={() => supabase.auth.signOut()}>Quitter</button>
          </span>
        </div>
      </header>
      <ToastProvider>
        <DragProvider>
          <main className="wrap page">{children}</main>
          {!["/prono", "/admin", "/admin/instagram", "/defile"].includes(path) && <Top5Dock />}
        </DragProvider>
      </ToastProvider>
    </>
  );
}
