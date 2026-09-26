import { assetUrl } from '../../lib/api.js';
import { CATEGORY_ICONS, categoryClass } from '../../lib/constants.js';
import { cx } from '../../lib/format.js';

/**
 * Photo if the report has one, otherwise the category icon on its earthy tint.
 * variant: "card" (16:10 grid thumb), "detail" (4:3 modal image) or "mini" (56px square).
 */
export function ItemThumb({ item, variant = 'card', children, className }) {
  const Icon = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.Other;
  const base = { card: 'thumb', detail: 'detail-img', mini: 'mini-thumb' }[variant];
  return (
    <div className={cx(base, categoryClass(item.category), className)}>
      {item.imageUrl ? (
        <img
          src={assetUrl(item.imageUrl)}
          alt={variant === 'mini' ? '' : `Photo of ${item.title}`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Icon className={variant === 'mini' ? 'icon' : 'cat-icon'} aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
