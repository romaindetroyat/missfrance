"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/app/providers";

// « J'aime » sur les photos : nombre par photo (sans dire qui) et les miens, mis à jour tout de suite à l'écran.
const Ctx = createContext({ count: () => 0, mine: () => false, toggle: () => {} });
export const useLikes = () => useContext(Ctx);

export function LikesProvider({ children }) {
  const app = useApp();
  const [map, setMap] = useState({}); // photo_id -> { n, mine }
  useEffect(() => {
    if (!app.me) return;
    supabase.rpc("photo_like_counts").then(({ data }) => {
      if (data) setMap(Object.fromEntries(data.map((r) => [r.photo_id, { n: r.n, mine: r.mine }])));
    });
  }, [app.me]);

  const toggle = useCallback(async (photoId) => {
    if (typeof photoId !== "number") return; // portrait de secours sans identifiant
    const cur = map[photoId] || { n: 0, mine: false };
    const next = { n: Math.max(0, cur.n + (cur.mine ? -1 : 1)), mine: !cur.mine };
    setMap((m) => ({ ...m, [photoId]: next }));
    const { error } = cur.mine
      ? await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("email", app.email)
      : await supabase.from("photo_likes").insert({ photo_id: photoId, email: app.email });
    if (error) setMap((m) => ({ ...m, [photoId]: cur })); // retour arrière si le serveur refuse
  }, [map, app.email]);

  const value = {
    count: (id) => map[id]?.n || 0,
    mine: (id) => !!map[id]?.mine,
    toggle,
    map,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const Heart = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>
);

// Bouton cœur : un tap pour aimer / ne plus aimer, avec le nombre de « j'aime »
export function LikeButton({ photo, className = "" }) {
  const likes = useLikes();
  if (!photo || typeof photo.id !== "number") return null;
  const n = likes.count(photo.id), on = likes.mine(photo.id);
  return (
    <button type="button" className={`like-btn${on ? " on" : ""} ${className}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); likes.toggle(photo.id); }}
      aria-pressed={on} aria-label={on ? "Je n'aime plus cette photo" : "J'aime cette photo"} data-tip={on ? "Retirer mon j'aime" : "J'aime"}>
      <Heart filled={on} />
      {n > 0 && <span>{n}</span>}
    </button>
  );
}
