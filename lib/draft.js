"use client";
import { useCallback, useEffect, useState } from "react";

// Brouillon du Top 5, gardé sur l'appareil tant qu'il n'est pas enregistré.
const EVT = "mf-draft";
const keyFor = (email, kind = "top5") => `mf2027-${kind}-${email}`;

function read(email, fallback, kind) {
  try {
    const raw = localStorage.getItem(keyFor(email, kind));
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function useDraft(email, saved, kind = "top5", fallbackPicks = null) {
  const savedPicks = saved?.picks || fallbackPicks || [];
  const [picks, setPicks] = useState(savedPicks);

  useEffect(() => {
    const sync = () => setPicks(read(email, savedPicks, kind));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, kind, savedPicks.join(",")]);

  const update = useCallback(
    (next) => {
      try {
        localStorage.setItem(keyFor(email, kind), JSON.stringify(next));
      } catch {}
      setPicks(next);
      window.dispatchEvent(new Event(EVT));
    },
    [email, kind]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(keyFor(email, kind));
    } catch {}
    window.dispatchEvent(new Event(EVT));
  }, [email, kind]);

  const dirty = picks.join(",") !== (saved?.picks || []).join(",");
  return { picks, update, clear, dirty };
}
