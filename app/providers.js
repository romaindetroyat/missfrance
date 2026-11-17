"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function Providers({ children }) {
  const [session, setSession] = useState(undefined); // undefined = chargement
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(t);
    };
  }, []);

  const email = session?.user?.email?.toLowerCase() || null;

  const reload = useCallback(async () => {
    if (!email) return;
    const [players, settings, candidates, photos, predictions, status, adjustments] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("candidates").select("*").order("region"),
      supabase.from("photos").select("id,candidate_id,url,type,caption,credit,source_page,width,height,added_at").eq("hidden", false).order("added_at", { ascending: false }),
      supabase.from("predictions").select("*"),
      supabase.rpc("players_status"),
      supabase.from("adjustments").select("*"),
    ]);
    const err = [players, settings, candidates, photos, predictions, status, adjustments].find((r) => r.error);
    if (err) return setError(err.error.message);
    setError(null);
    setData({
      players: players.data,
      settings: settings.data,
      candidates: candidates.data,
      photos: photos.data,
      predictions: predictions.data,
      status: status.data,
      adjustments: adjustments.data,
    });
  }, [email]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  const value = useMemo(() => {
    if (!data) return { session, email, loading: session === undefined || (!!email && !error), error, reload };
    const me = data.players.find((p) => p.email === email) || null;
    const ceremonyAt = data.settings ? new Date(data.settings.ceremony_at).getTime() : null;
    // Phase 1 : Top 5 principal jusqu'au début de la cérémonie. Phase 2 : ajustements jusqu'à adjust_until.
    const lockAt = ceremonyAt;
    const adjustUntil = data.settings?.adjust_until ? new Date(data.settings.adjust_until).getTime() : null;
    const byId = Object.fromEntries(data.candidates.map((c) => [c.id, c]));
    const photosBy = {};
    const rank = { officiel: 0, election: 1, maillot: 2, voyage: 3, autre: 4 };
    for (const p of data.photos) (photosBy[p.candidate_id] ||= []).push(p);
    for (const k in photosBy) photosBy[k].sort((a, b) => (rank[a.type] ?? 5) - (rank[b.type] ?? 5));
    return {
      session,
      email,
      loading: false,
      error,
      reload,
      me,
      ...data,
      byId,
      photosBy,
      ceremonyAt,
      lockAt,
      locked: lockAt ? now >= lockAt : false,
      adjustUntil,
      adjustLocked: adjustUntil ? now >= adjustUntil : false,
      myAdjustment: data.adjustments.find((p) => p.email === email) || null,
      results: data.settings?.results || null,
      myPrediction: data.predictions.find((p) => p.email === email) || null,
      now,
    };
  }, [data, session, email, error, reload, now]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
