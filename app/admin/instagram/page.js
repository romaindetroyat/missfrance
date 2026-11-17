"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/app/providers";
import { supabase } from "@/lib/supabase";

// Relevé manuel des abonnés Instagram (Instagram bloque les relevés automatiques).
// Chaque enregistrement est historisé puis les cotes sont recalculées.
export default function InstagramAdmin() {
  const app = useApp();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("instagram_stats").select("*");
    if (error) return setMsg("Chargement impossible : " + error.message);
    const by = Object.fromEntries(data.map((r) => [r.candidate_id, r]));
    setRows(app.candidates.map((c) => ({ c, handle: by[c.id]?.handle || "", followers: by[c.id]?.followers ?? "", saved: by[c.id] })));
  }
  useEffect(() => { if (app.me?.is_admin) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [app.me?.is_admin]);

  if (!app.me?.is_admin) return <p>Page réservée à l'organisateur.</p>;
  if (!rows) return <p className="muted">Chargement…</p>;

  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const parse = (v) => {
    const s = String(v).trim().toLowerCase().replace(/\s/g, "").replace(",", ".");
    const m = s.match(/^([\d.]+)(k|m)?$/);
    if (!m) return null;
    return Math.round(parseFloat(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1));
  };

  async function save() {
    setBusy(true); setMsg("");
    const changed = rows.filter((r) => r.handle !== (r.saved?.handle || "") || String(r.followers) !== String(r.saved?.followers ?? ""));
    for (const r of changed) {
      const n = r.followers === "" ? null : parse(r.followers);
      if (r.followers !== "" && n == null) { setBusy(false); return setMsg(`Nombre illisible pour ${r.c.region} : « ${r.followers} ».`); }
      const handle = r.handle.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "") || null;
      const { error } = await supabase.from("instagram_stats").update({ handle, followers: n, source: "saisie", updated_at: new Date().toISOString() }).eq("candidate_id", r.c.id);
      if (error) { setBusy(false); return setMsg("Enregistrement impossible : " + error.message); }
      if (n) await supabase.from("instagram_history").insert({ candidate_id: r.c.id, handle, followers: n, source: "saisie" });
    }
    const { error } = await supabase.rpc("request_odds_update");
    setBusy(false);
    setMsg(error ? `Enregistré (${changed.length}), mais recalcul refusé : ${error.message}` : `Enregistré (${changed.length} modification${changed.length > 1 ? "s" : ""}). Cotes en cours de recalcul, recharge la page dans une minute.`);
    load(); app.reload();
  }

  const filled = rows.filter((r) => r.followers !== "").length;
  return (
    <>
      <h1>Abonnés Instagram</h1>
      <p className="muted">
        Instagram bloque les relevés automatiques : saisis ici le nombre d'abonnés affiché sur chaque profil (ex. 12345, 12,3k ou 1,2m).
        {filled}/{rows.length} relevés. Le classement Instagram compte dans le modèle à partir de 25 relevés ; avant, seul l'écart d'abonnés compte un peu.
      </p>
      <div className="list">
        {rows.map((r, i) => (
          <div key={r.c.id} className="row ig">
            <span className="row-main">
              <span className="region">{r.c.region}</span>
              <span className="name">{r.c.nom}</span>
            </span>
            <input aria-label={`Compte Instagram de ${r.c.nom}`} placeholder="@compte" value={r.handle} onChange={(e) => set(i, "handle", e.target.value)} />
            {r.handle && (
              <a className="small" href={`https://www.instagram.com/${r.handle.replace(/^@/, "")}/`} target="_blank" rel="noreferrer">Ouvrir</a>
            )}
            <input aria-label={`Abonnés de ${r.c.nom}`} placeholder="abonnés" inputMode="decimal" value={r.followers} onChange={(e) => set(i, "followers", e.target.value)} className="num" />
          </div>
        ))}
      </div>
      <div className="savebar">
        <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer et recalculer les cotes"}</button>
        <span className="muted">{msg}</span>
      </div>
      <p className="small muted"><Link href="/admin">← Résultats officiels</Link></p>
    </>
  );
}
