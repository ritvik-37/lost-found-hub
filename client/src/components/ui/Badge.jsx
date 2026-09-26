import { titleCase } from '../../lib/format.js';

/** Status/type badge: colour + dot + text (never colour alone). */
export function Badge({ value, label, className = '' }) {
  if (!value) return null;
  return <span className={`badge b-${value} ${className}`}>{label ?? titleCase(value)}</span>;
}
