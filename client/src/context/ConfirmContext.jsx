import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from '../components/ui/Modal.jsx';

const ConfirmContext = createContext(async () => false);

/**
 * `const ok = await confirm({ title, message, confirmLabel, tone: 'danger' })`
 * An accessible replacement for window.confirm(); "Cancel" gets initial focus so Enter is safe.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      {request && (
        <Modal
          size="sm"
          role="alertdialog"
          title={request.title}
          describedBy="confirm-message"
          onClose={() => settle(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" data-autofocus onClick={() => settle(false)}>
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${request.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
                onClick={() => settle(true)}
              >
                {request.confirmLabel ?? 'Confirm'}
              </button>
            </>
          }
        >
          <p id="confirm-message" className="m-0">
            {request.message}
          </p>
        </Modal>
      )}
    </ConfirmContext>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
