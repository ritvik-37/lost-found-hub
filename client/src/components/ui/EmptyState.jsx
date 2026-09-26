import { cx } from '../../lib/format.js';

/** Empty/error state that always offers a next action. */
export function EmptyState({ icon: Icon, title, children, actions, className, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  return (
    <div className={cx('empty', className)}>
      {Icon && (
        <div className="ic">
          <Icon className="icon" aria-hidden="true" />
        </div>
      )}
      <Heading>{title}</Heading>
      {children && <p className="muted mx-auto max-w-md">{children}</p>}
      {actions && <div className="cta-row justify-center">{actions}</div>}
    </div>
  );
}
