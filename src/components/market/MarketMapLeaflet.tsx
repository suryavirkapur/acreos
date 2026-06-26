import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { cn } from '@/lib/utils';

import type { DistrictMapPoint } from '@/components/market/MarketMap';

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

const ABU_DHABI_CENTER: [number, number] = [24.45, 54.39];
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function momentumColor(pct: number): string {
  if (pct >= 8) return '#059669';
  if (pct >= 3) return '#10b981';
  if (pct >= 0) return '#2b50f0';
  if (pct >= -3) return '#f59e0b';
  return '#ef4444';
}

function markerRadius(price: number, min: number, max: number, compact: boolean): number {
  const t = max > min ? (price - min) / (max - min) : 0.5;
  return (compact ? 7 : 9) + t * (compact ? 8 : 12);
}

function FitBounds({ districts }: { districts: DistrictMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (districts.length === 0) return;
    const bounds = L.latLngBounds(
      districts.map((d) => [d.latitude, d.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.14), { animate: false });
  }, [map, districts]);

  return null;
}

function FlyToSelected({
  selected,
  districts,
}: {
  selected?: string | null;
  districts: DistrictMapPoint[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    const point = districts.find((d) => d.district === selected);
    if (!point) return;
    map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 11), { duration: 0.55 });
  }, [map, selected, districts]);

  return null;
}

type Props = {
  districts: DistrictMapPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
  className?: string;
  compact?: boolean;
};

export function MarketMapLeaflet({
  districts,
  selected,
  onSelect,
  className,
  compact = false,
}: Props) {
  const { priceRange, radiusRange } = useMemo(() => {
    if (districts.length === 0) {
      return { priceRange: { min: 0, max: 1 }, radiusRange: { min: 8, max: 16 } };
    }
    const prices = districts.map((d) => d.avgPricePerSqm);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return {
      priceRange: { min, max },
      radiusRange: {
        min: markerRadius(min, min, max, compact),
        max: markerRadius(max, min, max, compact),
      },
    };
  }, [districts, compact]);

  const activePoint = districts.find((d) => d.district === selected) ?? null;

  return (
    <div
      className={cn(
        'market-map-shell relative overflow-hidden rounded-2xl border border-border/60 shadow-inner',
        compact ? 'h-[320px]' : 'h-[500px]',
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
        <FitBounds districts={districts} />
        <FlyToSelected selected={selected} districts={districts} />

        {districts.map((d) => {
          const isActive = selected === d.district;
          const color = momentumColor(d.momentumPct);
          const radius = markerRadius(d.avgPricePerSqm, priceRange.min, priceRange.max, compact);

          return (
            <CircleMarker
              key={d.district}
              center={[d.latitude, d.longitude]}
              radius={isActive ? radius + 3 : radius}
              pathOptions={{
                color: '#ffffff',
                weight: isActive ? 3 : 2,
                fillColor: color,
                fillOpacity: isActive ? 0.92 : 0.78,
              }}
              eventHandlers={{
                click: () => onSelect?.(isActive ? null : d.district),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -6]}
                opacity={1}
                className="market-map-tooltip"
              >
                <span className="font-semibold">{d.district}</span>
                <span className="mx-1 text-muted-foreground">·</span>
                <span>{AED.format(d.avgPricePerSqm)}/sqm</span>
              </Tooltip>
              <Popup className="market-map-popup" closeButton={!compact}>
                <div className="min-w-[10rem]">
                  <p className="text-sm font-extrabold text-foreground">{d.district}</p>
                  <p className="mt-0.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {d.areaType.replace(/_/g, ' ')}
                  </p>
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Avg price</dt>
                      <dd className="font-bold text-foreground">
                        {AED.format(d.avgPricePerSqm)}/sqm
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Yield</dt>
                      <dd className="font-bold text-foreground">{d.grossYieldPct}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Momentum</dt>
                      <dd
                        className={cn(
                          'font-bold',
                          d.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                        )}
                      >
                        {d.momentumPct >= 0 ? '+' : ''}
                        {d.momentumPct}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Infra</dt>
                      <dd className="font-bold text-foreground">{d.infrastructureScore}/100</dd>
                    </div>
                  </dl>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {activePoint && (
        <div
          className={cn(
            'pointer-events-none absolute z-[500] rounded-xl border border-border/80 bg-card/95 text-foreground shadow-2xl backdrop-blur-md',
            compact ? 'top-3 right-3 w-48 p-2.5' : 'top-4 right-4 w-56 p-3',
          )}
        >
          <p className="text-sm font-extrabold tracking-tight">{activePoint.district}</p>
          <p className="mt-0.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {activePoint.areaType.replace(/_/g, ' ')}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Avg price</p>
              <p className="font-bold">{AED.format(activePoint.avgPricePerSqm)}/sqm</p>
            </div>
            <div>
              <p className="text-muted-foreground">Yield</p>
              <p className="font-bold">{activePoint.grossYieldPct}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Momentum</p>
              <p
                className={cn(
                  'font-bold',
                  activePoint.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                )}
              >
                {activePoint.momentumPct >= 0 ? '+' : ''}
                {activePoint.momentumPct}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Infra score</p>
              <p className="font-bold">{activePoint.infrastructureScore}/100</p>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute top-3 left-3 z-[500] flex flex-wrap gap-1.5">
        {[
          { label: 'Hot', color: '#059669' },
          { label: 'Rising', color: '#2b50f0' },
          { label: 'Cooling', color: '#f59e0b' },
          { label: 'Falling', color: '#ef4444' },
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

      {!compact && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-border/70 bg-card/90 px-2.5 py-1.5 text-[0.62rem] text-muted-foreground shadow-sm backdrop-blur-sm">
          Bubble size: AED {AED.format(priceRange.min)} – {AED.format(priceRange.max)} /sqm
          <span className="mx-1.5 text-border">|</span>
          Radius {radiusRange.min.toFixed(0)}–{radiusRange.max.toFixed(0)}px
        </div>
      )}
    </div>
  );
}
