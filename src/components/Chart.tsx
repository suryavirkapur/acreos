import { useId } from 'react';

import { cn } from '@/lib/utils';

export type ChartType = 'bar' | 'hbar' | 'line' | 'area' | 'pie' | 'donut';

export type ChartPoint = { label: string; value: number };

export type ChartSpec = {
  type: ChartType;
  title?: string;
  /** Optional unit hint used to format values: 'AED', '%', '/sqm', etc. */
  unit?: string;
  data: ChartPoint[];
};

const PALETTE = [
  '#2b50f0',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#ec4899',
  '#64748b',
  '#84cc16',
];

const NUM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function formatValue(value: number, unit?: string): string {
  const u = (unit ?? '').trim();
  if (u === '%') return `${NUM.format(value)}%`;

  let body: string;
  const abs = Math.abs(value);
  if (abs >= 1e9) body = `${NUM.format(value / 1e9)}B`;
  else if (abs >= 1e6) body = `${NUM.format(value / 1e6)}M`;
  else if (abs >= 1e3) body = `${NUM.format(value / 1e3)}K`;
  else body = NUM.format(value);

  if (!u) return body;
  if (u.toUpperCase() === 'AED') return `AED ${body}`;
  if (u.startsWith('/')) return `${body}${u}`;
  return `${body} ${u}`;
}

/** Validates and normalizes an unknown object into a ChartSpec, or null. */
export function parseChartSpec(raw: unknown): ChartSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  const validTypes: ChartType[] = ['bar', 'hbar', 'line', 'area', 'pie', 'donut'];
  if (typeof type !== 'string' || !validTypes.includes(type as ChartType)) return null;
  if (!Array.isArray(obj.data)) return null;

  const data: ChartPoint[] = [];
  for (const item of obj.data) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const label =
      typeof rec.label === 'string'
        ? rec.label
        : typeof rec.name === 'string'
          ? rec.name
          : typeof rec.x === 'string'
            ? rec.x
            : undefined;
    const rawValue = rec.value ?? rec.y ?? rec.count;
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (label === undefined || !Number.isFinite(value)) continue;
    data.push({ label, value });
  }

  if (data.length === 0) return null;

  return {
    type: type as ChartType,
    title: typeof obj.title === 'string' ? obj.title : undefined,
    unit: typeof obj.unit === 'string' ? obj.unit : undefined,
    data,
  };
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const norm = value / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

function VerticalBars({ data, unit }: { data: ChartPoint[]; unit?: string }) {
  const W = 640;
  const H = 300;
  const padX = 16;
  const padTop = 24;
  const padBottom = 56;
  const max = niceCeil(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const slot = plotW / data.length;
  const barW = Math.min(64, slot * 0.62);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padTop + plotH * (1 - t);
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={padX} y={y - 4} fontSize={10} fill="var(--ink-faint)">
              {formatValue(max * t, unit)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * plotH : 0;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + plotH - h;
        const color = PALETTE[i % PALETTE.length];
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={barW} height={h} rx={5} fill={color} />
            <text
              x={x + barW / 2}
              y={y - 6}
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
              fill="var(--ink)"
            >
              {formatValue(d.value, unit)}
            </text>
            <text
              x={x + barW / 2}
              y={H - padBottom + 16}
              fontSize={11}
              textAnchor="middle"
              fill="var(--ink-soft)"
            >
              {d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalBars({ data, unit }: { data: ChartPoint[]; unit?: string }) {
  const W = 640;
  const rowH = 34;
  const padTop = 8;
  const padBottom = 8;
  const labelW = 120;
  const valueW = 70;
  const H = padTop + padBottom + data.length * rowH;
  const max = niceCeil(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - labelW - valueW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {data.map((d, i) => {
        const y = padTop + i * rowH;
        const w = max > 0 ? (d.value / max) * plotW : 0;
        const color = PALETTE[i % PALETTE.length];
        return (
          <g key={`${d.label}-${i}`}>
            <text x={0} y={y + rowH / 2 + 4} fontSize={12} fill="var(--ink-soft)">
              {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
            </text>
            <rect
              x={labelW}
              y={y + 6}
              width={plotW}
              height={rowH - 14}
              rx={5}
              fill="var(--paper-soft)"
            />
            <rect x={labelW} y={y + 6} width={w} height={rowH - 14} rx={5} fill={color} />
            <text
              x={labelW + plotW + valueW}
              y={y + rowH / 2 + 4}
              fontSize={12}
              fontWeight={700}
              textAnchor="end"
              fill="var(--ink)"
            >
              {formatValue(d.value, unit)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineArea({
  data,
  unit,
  fill,
}: {
  data: ChartPoint[];
  unit?: string;
  fill: boolean;
}) {
  const gradientId = useId();
  const W = 640;
  const H = 300;
  const padL = 12;
  const padR = 16;
  const padTop = 24;
  const padBottom = 48;
  const max = niceCeil(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - padL - padR;
  const plotH = H - padTop - padBottom;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padL + stepX * i;
    const y = padTop + plotH * (1 - (max > 0 ? d.value / max : 0));
    return { x, y, d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points.at(-1)?.x.toFixed(1)} ${padTop + plotH} L ${points[0]?.x.toFixed(1)} ${padTop + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.28} />
          <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padTop + plotH * (1 - t);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={padL} y={y - 4} fontSize={10} fill="var(--ink-faint)">
              {formatValue(max * t, unit)}
            </text>
          </g>
        );
      })}
      {fill && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={linePath} fill="none" stroke={PALETTE[0]} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={`${p.d.label}-${i}`}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="var(--card)" stroke={PALETTE[0]} strokeWidth={2} />
          <text
            x={p.x}
            y={H - padBottom + 16}
            fontSize={10.5}
            textAnchor="middle"
            fill="var(--ink-soft)"
          >
            {p.d.label.length > 10 ? `${p.d.label.slice(0, 9)}…` : p.d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({
  data,
  unit,
  donut,
}: {
  data: ChartPoint[];
  unit?: string;
  donut: boolean;
}) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const inner = donut ? r * 0.58 : 0;
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;

  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = Math.max(0, d.value) / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const path = donut
      ? [
          `M ${cx + inner * Math.cos(start)} ${cy + inner * Math.sin(start)}`,
          `L ${x1} ${y1}`,
          `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
          `L ${cx + inner * Math.cos(end)} ${cy + inner * Math.sin(end)}`,
          `A ${inner} ${inner} 0 ${large} 0 ${cx + inner * Math.cos(start)} ${cy + inner * Math.sin(start)}`,
          'Z',
        ].join(' ')
      : [`M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, 'Z'].join(' ');
    return { path, color: PALETTE[i % PALETTE.length], frac };
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-44 shrink-0" aria-hidden="true">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} stroke="var(--card)" strokeWidth={2} />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={`${d.label}-${i}`} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[3px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">{formatValue(d.value, unit)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground">
              {Math.round(arcs[i].frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Chart({ spec, className }: { spec: ChartSpec; className?: string }) {
  const { type, title, unit, data } = spec;

  return (
    <figure className={cn('my-3 rounded-xl border border-border bg-card p-4', className)}>
      {title && (
        <figcaption className="mb-3 text-sm font-semibold tracking-tight text-foreground">
          {title}
        </figcaption>
      )}
      {type === 'bar' && <VerticalBars data={data} unit={unit} />}
      {type === 'hbar' && <HorizontalBars data={data} unit={unit} />}
      {type === 'line' && <LineArea data={data} unit={unit} fill={false} />}
      {type === 'area' && <LineArea data={data} unit={unit} fill />}
      {type === 'pie' && <PieChart data={data} unit={unit} donut={false} />}
      {type === 'donut' && <PieChart data={data} unit={unit} donut />}
    </figure>
  );
}
