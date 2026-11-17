"use client";
import { useState } from "react";
import { useApp } from "@/app/providers";
import { useDraft } from "@/lib/draft";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const first = (nom) => nom.split(" ")[0];

// Le Top 5 en cours d'édition, quelle que soit la phase :
// avant la cérémonie, le Top 5 principal ; pendant, les ajustements ; après, lecture seule.
export function useTop5() {
  const app = useApp();
  const toast = useToast();
  const phase = !app.locked ? "main" : !app.adjustLocked ? "adjust" : "closed";
  const isAdjust = phase === "adjust";
  const saved = isAdjust ? app.myAdjustment : app.myPrediction;
  const { picks, update, clear, dirty } = useDraft(app.email, saved, isAdjust ? "ajust" : "top5", isAdjust ? app.myPrediction?.picks : null);
  const [saving, setSaving] = useState(false);
  const editable = phase !== "closed";
  const shown = editable ? picks : app.myPrediction?.picks || [];

  function toggle(id) {
    if (!editable) return;
    const c = app.byId[id];
    const before = picks;
    const i = picks.indexOf(id);
    if (i >= 0) {
      update(picks.filter((p) => p !== id));
      toast(`${first(c.nom)} retirée de ton Top 5`, { label: "Annuler", run: () => update(before) });
    } else if (picks.length >= 5) {
      toast("Ton Top 5 est complet : retire d'abord une candidate.");
    } else {
      update([...picks, id]);
      toast(`${first(c.nom)} ajoutée en n° ${picks.length + 1}`, { label: "Annuler", run: () => update(before) });
    }
  }
  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= picks.length) return;
    const next = [...picks];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }
  async function save() {
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
  // Place une candidate à un rang précis (glisser-déposer) : déplacement si elle y est déjà,
  // insertion sinon ; si le Top 5 est plein, elle prend la place visée.
  function placeAt(id, index) {
    if (!editable) return;
    const c = app.byId[id];
    const before = picks;
    let next = picks.filter((p) => p !== id);
    const i = Math.max(0, Math.min(index, next.length));
    let replaced = null;
    if (!picks.includes(id) && picks.length >= 5) {
      replaced = next[i];
      next.splice(i, 1, id);
    } else {
      next.splice(i, 0, id);
    }
    next = next.slice(0, 5);
    if (next.join() === picks.join()) return;
    update(next);
    const r = next.indexOf(id) + 1;
    toast(
      replaced ? `${first(c.nom)} en n° ${r} à la place de ${first(app.byId[replaced].nom)}` : picks.includes(id) ? `${first(c.nom)} passe en n° ${r}` : `${first(c.nom)} ajoutée en n° ${r}`,
      { label: "Annuler", run: () => update(before) }
    );
  }
  // Remplace tout le Top 5 (ex. classement issu des duels)
  function setAll(list) {
    if (!editable) return;
    const before = picks;
    update(list.slice(0, 5));
    toast("Top 5 rempli depuis tes duels", { label: "Annuler", run: () => update(before) });
  }
  return { phase, editable, picks: shown, toggle, move, save, setAll, placeAt, dirty: editable && dirty, saving, full: picks.length === 5, hasSaved: !!saved };
}
