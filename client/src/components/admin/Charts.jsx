import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate } from '../../lib/format.js';

// Colours come from CSS tokens (--chart-*) so light/dark mode switch automatically.
const TICK = { fill: 'var(--muted-fg)', fontSize: 13 };
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function ChartTooltip({ active, payload, label, unit = 'report' }) {
  if (!active || !payload?.length) return null;
  const { value, payload: row } = payload[0];
  return (
    <div className="chart-tip">
      <strong>{row.tooltipLabel ?? label ?? row.name}</strong>
      <div>
        {value} {value === 1 ? unit : `${unit}s`}
      </div>
    </div>
  );
}

/** Every chart has a table twin so values never depend on colour or hover. */
function DataTable({ caption, headers, rows }) {
  return (
    <details className="chart-table">
      <summary>View as table</summary>
      <table className="data-table min-w-0">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((cell, i) => (i === 0 ? <th key={i} scope="row" className="font-medium">{cell}</th> : <td key={i}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function CategoryChart({ data }) {
  const rows = data.map((d) => ({ ...d, tooltipLabel: d.category }));
  return (
    <figure className="m-0" aria-label="Reports by category">
      <ResponsiveContainer width="100%" height={data.length * 32 + 8}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide allowDecimals={false} domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="category" width={104} tick={TICK} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
          <Bar
            dataKey="count"
            fill="var(--chart-bar)"
            barSize={12}
            radius={[0, 4, 4, 0]}
            background={{ fill: 'var(--chart-track)', radius: 4 }}
            isAnimationActive={!reducedMotion()}
          >
            <LabelList dataKey="count" position="right" offset={10} fill="var(--fg)" fontSize={13} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DataTable caption="Reports by category" headers={['Category', 'Reports']} rows={data.map((d) => [d.category, d.count])} />
    </figure>
  );
}

export function LostFoundDonut({ lost, found }) {
  const total = lost + found;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const data = [
    { name: 'Lost', value: lost, fill: 'var(--chart-lost)' },
    { name: 'Found', value: found, fill: 'var(--chart-found)' },
  ];
  return (
    <figure className="m-0">
      <div className="donut-wrap">
        <div className="relative h-[130px] w-[130px] shrink-0" role="img" aria-label={`${lost} lost and ${found} found, ${total} reports in total`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total ? data : [{ name: 'None', value: 1, fill: 'var(--chart-track)' }]}
                dataKey="value"
                innerRadius={42}
                outerRadius={62}
                startAngle={90}
                endAngle={-270}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={!reducedMotion()}
              >
                {(total ? data : [{ fill: 'var(--chart-track)' }]).map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              {total > 0 && <Tooltip content={<ChartTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden="true">
            <div>
              <div className="font-heading text-2xl font-bold leading-none">{total}</div>
              <div className="muted text-[.72rem]">reports</div>
            </div>
          </div>
        </div>
        <ul className="m-0 list-none p-0">
          {data.map((d) => (
            <li className="legend-item" key={d.name}>
              <span className="sw" style={{ background: d.fill }} aria-hidden="true" />
              {d.name} — <strong>{d.value}</strong> <span className="muted">({pct(d.value)}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export function WeekChart({ days }) {
  const rows = days.map((d) => ({
    ...d,
    label: formatDate(d.date, { weekday: 'short' }),
    tooltipLabel: formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' }),
  }));
  return (
    <figure className="m-0" aria-label="Reports per day, last 7 days">
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={rows} margin={{ top: 22, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval={0} />
          <YAxis hide allowDecimals={false} domain={[0, (max) => Math.max(1, max)]} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
          <Bar dataKey="count" fill="var(--chart-col)" maxBarSize={24} radius={[4, 4, 0, 0]} minPointSize={3} isAnimationActive={!reducedMotion()}>
            <LabelList dataKey="count" position="top" offset={6} fill="var(--fg)" fontSize={12} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DataTable
        caption="Reports per day, last 7 days"
        headers={['Day', 'Reports']}
        rows={rows.map((d) => [d.tooltipLabel, d.count])}
      />
    </figure>
  );
}
