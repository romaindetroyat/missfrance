"use client";
import { useCallback, useEffect, useState } from "react";

// Candidates mises de côté pour le comparateur (gardées sur l'appareil, partagées entre les pages).
const KEY = "mf2027-compare";
const EVT = "mf-compare";
export const COMPARE_MAX = 4;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useCompare() {
  const [ids, setIds] = useState([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((next) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setIds(next);
    window.dispatchEvent(new Event(EVT));
  }, []);
  const has = (id) => ids.includes(id);
  const toggle = (id) => save(has(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-COMPARE_MAX));
  const add = (id) => !has(id) && save([...ids, id].slice(-COMPARE_MAX));
  const remove = (id) => save(ids.filter((x) => x !== id));
  return { ids, has, toggle, add, remove, set: save };
}
