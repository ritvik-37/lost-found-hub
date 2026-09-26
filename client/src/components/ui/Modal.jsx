import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/format.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open modals, top-most last: only the top one reacts to Escape/Tab (e.g. a confirm over the item modal).
const stack = [];

/**
 * Accessible dialog: portal, focus moved inside on open and returned to the trigger on close,
 * Tab is trapped, Escape and backdrop click close it, page scroll is locked.
 */
export function Modal({ title, titleId: titleIdProp, onClose, children, footer, size, role = 'dialog', describedBy, headerExtra }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const autoId = useId();
  const titleId = titleIdProp ?? `${autoId}-title`;

  useEffect(() => {
    const dialog = dialogRef.current;
    const token = {};
    stack.push(token);
    const previouslyFocused = document.activeElement;
    const target = dialog.querySelector('[data-autofocus]') ?? dialog.querySelector(FOCUSABLE) ?? dialog;
    target.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (stack.at(-1) !== token) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
      } else if (e.key === 'Tab') {
        const nodes = [...dialog.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes.at(-1);
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        className={cx('modal', size === 'sm' && 'modal-sm')}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h3 id={titleId} className="m-0">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => onCloseRef.current?.()}>
              <X className="icon" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
