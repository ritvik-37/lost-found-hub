import { STATUS_STEPS } from '../../lib/constants.js';
import { cx, titleCase } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';

/** PENDING → VERIFIED → CLAIMED → CLOSED progress (REJECTED is shown on its own). */
export function StatusTimeline({ status, note }) {
  if (status === 'REJECTED') {
    return (
      <div className="timeline">
        <Badge value="REJECTED" />
        <span className="muted text-[.8rem]">{note ? `Did not pass review: ${note}` : 'Report did not pass review'}</span>
      </div>
    );
  }
  const current = STATUS_STEPS.indexOf(status);
  return (
    <ol className="timeline m-0 list-none p-0" aria-label={`Status: ${titleCase(status)}, step ${current + 1} of ${STATUS_STEPS.length}`}>
      {STATUS_STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-1" aria-current={i === current ? 'step' : undefined}>
          {i > 0 && <span className={cx('tl-line', i <= current && 'done')} aria-hidden="true" />}
          <span className={cx('tl-step', i <= current && 'done', i === current && 'now')}>
            <span className="tl-dot" aria-hidden="true" />
            {titleCase(step)}
          </span>
        </li>
      ))}
    </ol>
  );
}
