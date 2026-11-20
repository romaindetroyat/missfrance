"use client";
import { useEffect, useState } from "react";
import { useApp } from "../../providers";
import { supabase } from "@/lib/supabase";
import { InvitesLog } from "@/components/Invite";

const when = (t) => {
  if (!t) return null;
  const d = new Date(t), mins = Math.round((Date.now() - d) / 60000);
  if (mins < 2) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (mins < 24 * 60) return `il y a ${Math.round(mins / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) + " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");
};

// Suivi des joueurs (admin) : invités, connectés, Top 5 enregistrés, invitations envoyées, retrait d'un joueur
export default function Suivi() {
  const app = useApp();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const load = () => supabase.rpc("admin_activity").then(({ data, error }) => (error ? setErr(error.message) : setRows(data)));
  useEffect(() => { if (app.me?.is_admin) load(); }, [app.me?.is_admin]);

  if (!app.me?.is_admin) return <p className="muted">Page réservée à l'admin.</p>;
  if (err) return <p className="error">{err}</p>;
  if (!rows) return <p className="muted">Chargement…</p>;

  const connected = rows.filter((r) => r.first_login || r.last_seen).length;
  const played = rows.filter((r) => r.has_top5).length;
  const adminOf = Object.fromEntries(app.players.map((p) => [p.email, p.is_admin]));
  const remove = async (r) => {
    if (!confirm(`Retirer ${r.display_name} (${r.email}) ? Son Top 5 sera supprimé.`)) return;
    const { data, error } = await supabase.rpc("remove_player", { p_email: r.email });
    if (error || data !== "ok") return alert(error?.message || data);
    load();
    app.reload();
  };
  const stateOf = (r) => (r.has_top5 ? ["Top 5 enregistré", "ok"] : r.first_login || r.last_seen ? ["Connecté, pas de Top 5", "warn"] : ["Jamais connecté", "muted"]);

  return (
    <>
      <h1>Suivi des joueurs</h1>
      <div className="suivi-kpis">
        <div><strong>{rows.length}</strong><span>invités</span></div>
        <div><strong>{connected}</strong><span>déjà connectés</span></div>
        <div><strong>{played}</strong><span>Top 5 enregistrés</span></div>
      </div>
      <p className="muted small">Visible par toi seul. « Dernière visite » est mise à jour chaque fois qu'un joueur ouvre le site. <button type="button" className="link" onClick={load}>Actualiser</button></p>
      <div className="list suivi">
        {rows.map((r) => {
          const [label, cls] = stateOf(r);
          return (
            <div key={r.email} className="row">
              <span className="row-main">
                <span className="name">{r.display_name}</span>
                <span className="meta">
                  {r.email}
                  {r.invited_by_name ? ` · invité par ${r.invited_by_name}` : ""}
                  {` · invité ${when(r.invited_at)}`}
                </span>
                <span className="meta">
                  {r.last_seen ? `Dernière visite ${when(r.last_seen)}` : r.last_sign_in ? `Connecté ${when(r.last_sign_in)}` : "Pas encore venu"}
                  {r.visits > 1 ? ` · ${r.visits} visites` : ""}
                  {r.has_top5 ? ` · Top 5 le ${new Date(r.top5_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                  {r.has_adjust ? " · ajustement fait" : ""}
                </span>
              </span>
              <span className="suivi-side">
                <span className={`suivi-state ${cls}`}>{label}</span>
                {!adminOf[r.email] && <button type="button" className="link small" onClick={() => remove(r)}>Retirer</button>}
              </span>
            </div>
          );
        })}
      </div>
      <InvitesLog />
    </>
  );
}
