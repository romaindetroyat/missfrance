"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useApp } from "@/app/providers";
import { portraitOf } from "@/components/Bits";
import { useTop5 } from "@/lib/top5";

// Glisser-déposer des candidates vers le Top 5 (souris et doigt, via les Pointer Events).
// Cibles : tout élément [data-slot="n"] (une place du Top 5) ou [data-drop="top5"] (ajout en fin de liste).
// À la souris, le glisser démarre après un petit déplacement ; au doigt, après un appui long (pour laisser défiler la page).
const Ctx = createContext(null);
export const useDrag = () => useContext(Ctx);

export default function DragProvider({ children }) {
  const app = useApp();
  const t = useTop5();
  const [drag, setDrag] = useState(null); // { id, x, y, slot, zone }
  const st = useRef(null);
  const suppressClick = useRef(false);

  const target = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const slot = el?.closest?.("[data-slot]");
    if (slot) return { slot: Number(slot.dataset.slot), zone: true };
    return { slot: null, zone: !!el?.closest?.('[data-drop="top5"]') };
  };

  const end = useCallback((commit, x, y) => {
    const s = st.current;
    st.current = null;
    clearTimeout(s?.timer);
    document.documentElement.classList.remove("dragging-active");
    if (s?.active && commit) {
      const { slot, zone } = target(x, y);
      if (slot != null) t.placeAt(s.id, slot);
      else if (zone && !t.picks.includes(s.id)) t.toggle(s.id);
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 50);
    }
    setDrag(null);
  }, [t]);

  useEffect(() => {
    const move = (e) => {
      const s = st.current;
      if (!s) return;
      const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
      if (!s.active) {
        if (s.touch) { if (Math.hypot(dx, dy) > 10) { clearTimeout(s.timer); st.current = null; } return; }
        if (Math.hypot(dx, dy) < 6) return;
        s.active = true;
        document.documentElement.classList.add("dragging-active");
      }
      e.preventDefault();
      const tg = target(e.clientX, e.clientY);
      setDrag({ id: s.id, x: e.clientX, y: e.clientY, ...tg });
    };
    const up = (e) => st.current && end(true, e.clientX, e.clientY);
    const cancel = () => st.current && end(false);
    // Bloque le défilement de la page pendant un glisser au doigt
    const touchmove = (e) => { if (st.current?.active) e.preventDefault(); };
    const click = (e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", touchmove, { passive: false });
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("click", click, true);
    };
  }, [end]);

  // Propriétés à poser sur un élément déplaçable ; immediate = poignée (démarre sans appui long)
  const handle = useCallback((id, { immediate = false } = {}) => ({
    onPointerDown: (e) => {
      if (!t.editable || (e.button != null && e.button !== 0)) return;
      const touch = e.pointerType !== "mouse";
      const s = { id, x0: e.clientX, y0: e.clientY, touch: touch && !immediate, active: false };
      st.current = s;
      if (touch && !immediate) {
        s.timer = setTimeout(() => {
          if (st.current !== s) return;
          s.active = true;
          document.documentElement.classList.add("dragging-active");
          navigator.vibrate?.(15);
          setDrag({ id, x: s.x0, y: s.y0, ...target(s.x0, s.y0) });
        }, 320);
      } else if (immediate) {
        s.active = true;
        document.documentElement.classList.add("dragging-active");
        setDrag({ id, x: s.x0, y: s.y0, ...target(s.x0, s.y0) });
      }
    },
    onContextMenu: (e) => { if (st.current) e.preventDefault(); },
    draggable: false,
  }), [t.editable]);

  const c = drag && app.byId[drag.id];
  const src = c && portraitOf(app, c);
  return (
    <Ctx.Provider value={{ drag, handle }}>
      {children}
      {drag && c && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" /> : <span>{c.nom[0]}</span>}
          <em>{drag.slot != null ? `N° ${drag.slot + 1}` : drag.zone ? "Ajouter" : c.nom.split(" ")[0]}</em>
        </div>
      )}
    </Ctx.Provider>
  );
}
