"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

// Petit message éphémère en bas d'écran, avec une action facultative (« Annuler »).
const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, action) => {
    clearTimeout(timer.current);
    setToast({ text, action, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-zone" aria-live="polite">
        {toast && (
          <div key={toast.key} className="toast" role="status">
            <span>{toast.text}</span>
            {toast.action && (
              <button onClick={() => { toast.action.run(); setToast(null); }}>{toast.action.label}</button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
