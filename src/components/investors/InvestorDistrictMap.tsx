import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { titleCase } from '@/components/investors/investor-utils';
import { cn } from '@/lib/utils';

type DistrictCoord = {
  district: string;
  latitude: number;
  longitude: number;
};

export type InvestorDistrictPoint = DistrictCoord & {
  count: number;
  avgFit: number;
  dominantSector: string;
};

const ABU_DHABI_CENTER: [number, number] = [24.45, 54.39];
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function fitColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#2b50f0';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

function markerRadius(count: number, min: number, max: number): number {
  const t = max > min ? (count - min) / (max - min) : 0.5;
  return 8 + t * 16;
}

function FitBounds({ points }: { points: InvestorDistrictPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.16), { animate: false });
  }, [map, points]);
  return null;
}

function FlyToSelected({
  selected,
  points,
}: {
  selected?: string | null;
  points: InvestorDistrictPoint[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const point = points.find((p) => p.district === selected);
    if (!point) return;
    map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 11), { duration: 0.55 });
  }, [map, selected, points]);
  return null;
}

type Props = {
  points: InvestorDistrictPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
  compact?: boolean;
  className?: string;
};

export function InvestorDistrictMap({
  points,
  selected,
  onSelect,
  compact = false,
  className,
}: Props) {
  const countRange = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 1 };
    const counts = points.map((p) => p.count);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [points]);

  const active = points.find((p) => p.district === selected) ?? null;

  return (
    <div
      className={cn(
        'market-map-shell relative overflow-hidden rounded-2xl border border-border/60 shadow-inner',
        compact ? 'h-[300px]' : 'h-[460px]',
        className,
      )}
    >
      <MapContainer
        center={ABU_DHABI_CENTER}
        zoom={10}
        scrollWheelZoom={!compact}
        zoomControl={!compact}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitBounds points={points} />
        <FlyToSelected selected={selected} points={points} />

        {points.map((p) => {
          const isActive = selected === p.district;
          const radius = markerRadius(p.count, countRange.min, countRange.max);
          const color = fitColor(p.avgFit);

          return (
            <CircleMarker
              key={p.district}
              center={[p.latitude, p.longitude]}
              radius={isActive ? radius + 3 : radius}
              pathOptions={{
                color: '#ffffff',
                weight: isActive ? 3 : 2,
                fillColor: color,
                fillOpacity: isActive ? 0.92 : 0.8,
              }}
              eventHandlers={{
                click: () => onSelect?.(isActive ? null : p.district),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} className="market-map-tooltip">
                <span className="font-semibold">{p.district}</span>
                <span className="mx-1 text-muted-foreground">·</span>
                <span>{p.count} mandates</span>
              </Tooltip>
              <Popup className="market-map-popup" closeButton={!compact}>
                <div className="min-w-[10rem]">
                  <p className="text-sm font-extrabold text-foreground">{p.district}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.count} investor{p.count === 1 ? '' : 's'} · avg fit {p.avgFit}
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="text-muted-foreground">Top sector </span>
                    <span className="font-semibold text-foreground">
                      {titleCase(p.dominantSector)}
                    </span>
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {active && (
        <div className="pointer-events-none absolute top-3 right-3 z-[500] w-48 rounded-xl border border-border/80 bg-card/95 p-2.5 shadow-2xl backdrop-blur-md">
          <p className="text-sm font-extrabold">{active.district}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {active.count} mandates · {titleCase(active.dominantSector)}
          </p>
          <p className="mt-2 text-lg font-extrabold text-primary">{active.avgFit}</p>
          <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Avg strategic fit
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute top-3 left-3 z-[500] flex flex-wrap gap-1.5">
        {[
          { label: 'High fit', color: '#059669' },
          { label: 'Strong', color: '#2b50f0' },
          { label: 'Moderate', color: '#f59e0b' },
          { label: 'Weak', color: '#ef4444' },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-2 py-0.5 text-[0.62rem] font-bold text-foreground shadow-sm backdrop-blur-sm"
          >
            <span className="size-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
