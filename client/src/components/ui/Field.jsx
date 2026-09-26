import { CircleAlert } from 'lucide-react';
import { cx } from '../../lib/format.js';

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p className="error" id={id}>
      <CircleAlert className="icon-sm" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** Label + control + optional hint + error, wired up for screen readers via the control's id. */
export function Field({ id, label, required, optional, hint, hintId, error, children, className }) {
  return (
    <div className={cx('field', className)}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {optional && <span className="optional"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <span className="hint" id={hintId ?? `${id}-hint`}>
          {hint}
        </span>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
