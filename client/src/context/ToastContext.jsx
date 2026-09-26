import { Check, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
const TOAST_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  /** toast('Saved.') or toast('Something failed.', 'err'). Auto-dismisses after ~4s. */
  const toast = useCallback(
    (message, type = 'ok') => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'ok' ? <Check className="icon" aria-hidden="true" /> : <CircleAlert className="icon" aria-hidden="true" />}
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
              <X className="icon-sm" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
