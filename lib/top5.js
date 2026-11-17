"use client";
import { useState } from "react";
import { useApp } from "@/app/providers";
import { useDraft } from "@/lib/draft";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const first = (nom) => nom.split(" ")[0];
export const SLOTS = 5;
// Le Top 5 est un tableau de 5 places indépendantes (null = place libre) :
// on peut désigner sa 3e dauphine sans avoir choisi sa Miss France.
export const normalize = (arr) => Array.from({ length: SLOTS }, (_, i) => (arr && arr[i]) || null);
const RANK_NAMES = ["Miss France", "1re dauphine", "2e dauphine", "3e dauphine", "4e dauphine"];

// Le Top 5 en cours d'édition, quelle que soit la phase :
// avant la cérémonie, le Top 5 principal ; pendant, les ajustements ; après, lecture seule.
export function useTop5() {
  const app = useApp();
  const toast = useToast();
  const phase = !app.locked ? "main" : !app.adjustLocked ? "adjust" : "closed";
  const isAdjust = phase === "adjust";
  const saved = isAdjust ? app.myAdjustment : app.myPrediction;
  const { picks: raw, update, clear, dirty } = useDraft(app.email, saved, isAdjust ? "ajust" : "top5", isAdjust ? app.myPrediction?.picks : null);
  const [saving, setSaving] = useState(false);
  const editable = phase !== "closed";
  const picks = normalize(editable ? raw : app.myPrediction?.picks);
  const count = picks.filter(Boolean).length;
  const nextSlot = picks.indexOf(null);
  const set = (next) => update(normalize(next));
  const undo = (before) => ({ label: "Annuler", run: () => set(before) });

  function toggle(id) {
    if (!editable) return;
    const c = app.byId[id];
    const i = picks.indexOf(id);
    if (i >= 0) {
      const next = [...picks]; next[i] = null; set(next);
      toast(`${first(c.nom)} retirée (${RANK_NAMES[i]})`, undo(picks));
    } else if (nextSlot < 0) {
      toast("Ton Top 5 est complet : retire d'abord une candidate.");
    } else {
      const next = [...picks]; next[nextSlot] = id; set(next);
      toast(`${first(c.nom)} : ${RANK_NAMES[nextSlot]}`, undo(picks));
    }
  }
  // Place une candidate à un rang précis : échange si elle est déjà classée, remplace l'occupante sinon.
  function placeAt(id, index) {
    if (!editable || index < 0 || index >= SLOTS) return;
    const c = app.byId[id];
    const next = [...picks];
    const from = next.indexOf(id);
    const occupant = next[index];
    if (from === index) return;
    if (from >= 0) { next[from] = occupant; next[index] = id; }
    else next[index] = id;
    set(next);
    const msg = from >= 0
      ? `${first(c.nom)} passe ${RANK_NAMES[index].toLowerCase()}${occupant ? `, ${first(app.byId[occupant].nom)} prend sa place` : ""}`
      : occupant ? `${first(c.nom)} : ${RANK_NAMES[index]}, à la place de ${first(app.byId[occupant].nom)}` : `${first(c.nom)} : ${RANK_NAMES[index]}`;
    toast(msg, undo(picks));
  }
  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= SLOTS) return;
    const next = [...picks];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  }
  function clearSlot(i) {
    const next = [...picks]; next[i] = null; set(next);
  }
  async function save() {
    if (count < SLOTS) return false;
    setSaving(true);
    const { error } = await supabase.from(isAdjust ? "adjustments" : "predictions").upsert({ email: app.email, picks });
    setSaving(false);
    if (error) {
      toast(/verrouill|ouverts/i.test(error.message) ? "Trop tard : cette phase est fermée." : "L'enregistrement a échoué, ton brouillon est gardé. Réessaie.");
      return false;
    }
    await app.reload();
    clear();
    toast(isAdjust ? "Ajustement enregistré ✓" : "Top 5 enregistré ✓");
    return true;
  }
  // Remplace tout le Top 5 (ex. classement issu des duels)
  function setAll(list) {
    if (!editable) return;
    set(list.slice(0, SLOTS));
    toast("Top 5 rempli depuis tes duels", undo(picks));
  }
  return {
    phase, editable, picks, count, nextSlot, toggle, move, save, setAll, placeAt, clearSlot,
    dirty: editable && dirty, saving, full: count === SLOTS, hasSaved: !!saved, RANK_NAMES,
  };
}
