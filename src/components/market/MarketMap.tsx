import { useEffect, useState } from 'react';

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

type Props = {
  districts: DistrictMapPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
  className?: string;
  compact?: boolean;
};

function MapSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40',
        compact ? 'h-[320px]' : 'h-[500px]',
      )}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground">Loading Abu Dhabi map…</p>
      </div>
    </div>
  );
}

export function MarketMap(props: Props) {
  const [LeafletMap, setLeafletMap] = useState<
    typeof import('@/components/market/MarketMapLeaflet').MarketMapLeaflet | null
  >(null);

  useEffect(() => {
    let active = true;
    import('@/components/market/MarketMapLeaflet').then((mod) => {
      if (active) setLeafletMap(() => mod.MarketMapLeaflet);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!LeafletMap) {
    return <MapSkeleton compact={props.compact} />;
  }

  return <LeafletMap {...props} />;
}
