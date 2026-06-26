import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export type ScatterPoint = {
  district: string;
  avgPricePerSqm: number;
  grossYieldPct: number;
  momentumPct: number;
};

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const norm = value / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

type Props = {
  points: ScatterPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
  className?: string;
};

export function YieldPriceScatter({ points, selected, onSelect, className }: Props) {
  const W = 520;
  const H = 300;
  const padL = 52;
  const padR = 16;
  const padT = 20;
  const padB = 44;

  const { plotted, maxPrice, maxYield } = useMemo(() => {
    if (points.length === 0) {
      return { plotted: [], maxPrice: 1, maxYield: 10 };
    }
    const maxPrice = niceCeil(Math.max(...points.map((p) => p.avgPricePerSqm)));
    const maxYield = niceCeil(Math.max(...points.map((p) => p.grossYieldPct)));
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const plotted = points.map((p) => ({
      ...p,
      x: padL + (p.avgPricePerSqm / maxPrice) * plotW,
      y: padT + plotH - (p.grossYieldPct / maxYield) * plotH,
    }));

    return { plotted, maxPrice, maxYield };
  }, [points]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} role="img" aria-label="Yield vs price scatter plot">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + (H - padT - padB) * (1 - t);
        return (
          <g key={`y-${t}`}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={padL - 6} y={y + 3} fontSize={9} textAnchor="end" fill="var(--ink-faint)">
              {(maxYield * t).toFixed(1)}%
            </text>
          </g>
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const x = padL + (W - padL - padR) * t;
        return (
          <g key={`x-${t}`}>
            <line x1={x} y1={padT} x2={x} y2={H - padB} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
            <text x={x} y={H - padB + 16} fontSize={9} textAnchor="middle" fill="var(--ink-faint)">
              {AED.format(maxPrice * t)}
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--ink-soft)" fontWeight={600}>
        Avg price per sqm (AED)
      </text>
      <text
        x={14}
        y={H / 2}
        fontSize={10}
        textAnchor="middle"
        fill="var(--ink-soft)"
        fontWeight={600}
        transform={`rotate(-90 14 ${H / 2})`}
      >
        Gross yield %
      </text>

      {plotted.map((p) => {
        const isActive = selected === p.district;
        const color = p.momentumPct >= 0 ? '#2b50f0' : '#ef4444';
        return (
          <g
            key={p.district}
            className="cursor-pointer"
            onClick={() => onSelect?.(isActive ? null : p.district)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 8 : 6}
              fill={color}
              fillOpacity={isActive ? 0.95 : 0.7}
              stroke="var(--card)"
              strokeWidth={2}
            />
            {isActive && (
              <text x={p.x} y={p.y - 12} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--ink)">
                {p.district}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
