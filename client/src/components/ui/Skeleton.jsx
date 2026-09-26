import { LoaderCircle } from 'lucide-react';
import { cx } from '../../lib/format.js';

export function Skeleton({ className, style }) {
  return <div className={cx('skeleton', className)} style={style} aria-hidden="true" />;
}

export function CardSkeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
    </div>
  ));
}

export function RowSkeletons({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="list-row" aria-hidden="true">
      <Skeleton className="h-14 w-14 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  ));
}

/** Screen-reader-friendly loading line for regions that are fetching. */
export function Loading({ label = 'Loading…', className }) {
  return (
    <p className={cx('muted flex items-center gap-2', className)} role="status">
      <LoaderCircle className="icon spin" aria-hidden="true" />
      {label}
    </p>
  );
}
