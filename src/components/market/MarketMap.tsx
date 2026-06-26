import { useId, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

export type DistrictMapPoint = {
  district: string;
  latitude: number;
  longitude: number;
  avgPricePerSqm: number;
  grossYieldPct: number;
  momentumPct: number;
  infrastructureScore: number;
  areaType: string;
};

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

function momentumColor(pct: number): string {
  if (pct >= 8) return '#059669';
  if (pct >= 3) return '#10b981';
  if (pct >= 0) return '#2b50f0';
  if (pct >= -3) return '#f59e0b';
  return '#ef4444';
}

function project(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
  pad: number,
) {
  const x =
    pad + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * (width - pad * 2);
  const y =
    pad + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * (height - pad * 2);
  return { x, y };
}

function markerRadius(price: number, min: number, max: number, compact = false): number {
  const t = max > min ? (price - min) / (max - min) : 0.5;
  return (compact ? 5 : 7) + t * (compact ? 10 : 14);
}

type Props = {
  districts: DistrictMapPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
  className?: string;
  compact?: boolean;
};

export function MarketMap({ districts, selected, onSelect, className, compact = false }: Props) {
  const gradientId = useId();
  const glowId = useId();
  const [hovered, setHovered] = useState<string | null>(null);

  const W = 720;
  const H = compact ? 320 : 480;
  const pad = compact ? 36 : 44;

  const { points, bounds, priceRange } = useMemo(() => {
    if (districts.length === 0) {
      return {
        points: [],
        bounds: { minLat: 24.3, maxLat: 24.55, minLng: 54.33, maxLng: 54.78 },
        priceRange: { min: 0, max: 1 },
      };
    }

    const lats = districts.map((d) => d.latitude);
    const lngs = districts.map((d) => d.longitude);
    const prices = districts.map((d) => d.avgPricePerSqm);
    const latPad = 0.02;
    const lngPad = 0.03;

    const bounds = {
      minLat: Math.min(...lats) - latPad,
      maxLat: Math.max(...lats) + latPad,
      minLng: Math.min(...lngs) - lngPad,
      maxLng: Math.max(...lngs) + lngPad,
    };

    const points = districts.map((d) => ({
      ...d,
      ...project(d.latitude, d.longitude, bounds, W, H, pad),
      r: markerRadius(d.avgPricePerSqm, Math.min(...prices), Math.max(...prices), compact),
    }));

    return {
      points,
      bounds,
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    };
  }, [districts, compact]);

  const active = hovered ?? selected ?? null;
  const activePoint = points.find((p) => p.district === active);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Abu Dhabi district market map"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="45%" stopColor="#155e75" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0" />
          </radialGradient>
          <filter id="map-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
          </filter>
        </defs>

        <rect width={W} height={H} fill={`url(#${gradientId})`} rx={16} />
        <rect width={W} height={H} fill={`url(#${glowId})`} rx={16} />

        {/* stylized landmass */}
        <path
          d="M 80 120 C 140 80, 220 70, 320 95 C 420 120, 500 100, 620 130 C 680 145, 700 200, 680 280 C 660 360, 580 400, 480 410 C 360 420, 240 400, 160 360 C 90 320, 50 250, 60 180 Z"
          fill="rgba(247, 244, 238, 0.12)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1.5}
        />
        <path
          d="M 120 180 C 200 150, 300 160, 400 175 C 500 190, 580 210, 640 250 C 600 300, 500 330, 380 340 C 260 350, 180 320, 130 270 Z"
          fill="rgba(238, 233, 223, 0.08)"
        />

        {/* grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={pad}
            y1={pad + ((H - pad * 2) / 5) * i}
            x2={W - pad}
            y2={pad + ((H - pad * 2) / 5) * i}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={pad + ((W - pad * 2) / 7) * i}
            y1={pad}
            x2={pad + ((W - pad * 2) / 7) * i}
            y2={H - pad}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        <text x={pad} y={compact ? 22 : 28} fill="rgba(255,255,255,0.55)" fontSize={compact ? 10 : 11} fontWeight={700}>
          ABU DHABI · DISTRICT MARKET MAP
        </text>
        {!compact && (
          <text x={W - pad} y={28} fill="rgba(255,255,255,0.45)" fontSize={10} textAnchor="end">
            Bubble size = avg price/sqm
          </text>
        )}

        {points.map((p) => {
          const isActive = active === p.district;
          const color = momentumColor(p.momentumPct);
          return (
            <g
              key={p.district}
              className="cursor-pointer transition-transform"
              onMouseEnter={() => setHovered(p.district)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect?.(isActive ? null : p.district)}
              filter={isActive ? 'url(#map-shadow)' : undefined}
            >
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r + 10}
                  fill={color}
                  opacity={0.18}
                  className="animate-pulse"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={color}
                fillOpacity={isActive ? 0.95 : 0.78}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {isActive && (
                <text
                  x={p.x}
                  y={p.y - p.r - 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize={11}
                  fontWeight={700}
                >
                  {p.district}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activePoint && (
        <div
          className={cn(
            'pointer-events-none absolute rounded-xl border border-white/15 bg-(--ink-deep)/90 text-white shadow-2xl backdrop-blur-md',
            compact ? 'right-3 bottom-3 w-48 p-2.5' : 'right-4 bottom-4 w-56 p-3',
          )}
        >
          <p className="text-sm font-extrabold tracking-tight">{activePoint.district}</p>
          <p className="mt-0.5 text-[0.65rem] font-semibold tracking-wide text-white/55 uppercase">
            {activePoint.areaType.replace(/_/g, ' ')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-white/50">Avg price</p>
              <p className="font-bold">{AED.format(activePoint.avgPricePerSqm)}/sqm</p>
            </div>
            <div>
              <p className="text-white/50">Yield</p>
              <p className="font-bold">{activePoint.grossYieldPct}%</p>
            </div>
            <div>
              <p className="text-white/50">Momentum</p>
              <p
                className={cn(
                  'font-bold',
                  activePoint.momentumPct >= 0 ? 'text-emerald-300' : 'text-red-300',
                )}
              >
                {activePoint.momentumPct >= 0 ? '+' : ''}
                {activePoint.momentumPct}%
              </p>
            </div>
            <div>
              <p className="text-white/50">Infra score</p>
              <p className="font-bold">{activePoint.infrastructureScore}/100</p>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {[
            { label: 'Hot', color: '#059669' },
            { label: 'Rising', color: '#2b50f0' },
            { label: 'Cooling', color: '#f59e0b' },
            { label: 'Falling', color: '#ef4444' },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[0.62rem] font-bold text-white/80 backdrop-blur-sm"
            >
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[0.62rem] text-white/60 backdrop-blur-sm">
          AED {AED.format(priceRange.min)} – {AED.format(priceRange.max)} /sqm
        </div>
      )}
    </div>
  );
}
