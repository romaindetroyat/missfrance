"use client";
import { useCallback, useEffect, useState } from "react";

// Brouillon du Top 5, gardé sur l'appareil tant qu'il n'est pas enregistré.
const EVT = "mf-draft";
const keyFor = (email) => `mf2027-draft-${email}`;

function read(email, fallback) {
  try {
    const raw = localStorage.getItem(keyFor(email));
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function useDraft(email, saved) {
  const savedPicks = saved?.picks || [];
  const [picks, setPicks] = useState(savedPicks);

  useEffect(() => {
    const sync = () => setPicks(read(email, savedPicks));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, savedPicks.join(",")]);

  const update = useCallback(
    (next) => {
      try {
        localStorage.setItem(keyFor(email), JSON.stringify(next));
      } catch {}
      setPicks(next);
      window.dispatchEvent(new Event(EVT));
    },
    [email]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(keyFor(email));
    } catch {}
    window.dispatchEvent(new Event(EVT));
  }, [email]);

  const dirty = picks.join(",") !== savedPicks.join(",");
  return { picks, update, clear, dirty };
}
