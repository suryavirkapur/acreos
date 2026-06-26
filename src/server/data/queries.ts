import { getDataStore } from '@/server/data/store';
import type { Parcel } from '@/server/data/types';

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type DistrictPriceTrend = {
  district: string;
  avgPricePerSqm: number;
  txnCount: number;
  momentumPct: number;
};

/**
 * Price momentum by district: compares avg price/sqm in the most recent 6
 * months vs the prior 6 months across the 2023-2026 transaction series.
 */
export function priceTrendByDistrict(limit = 20): DistrictPriceTrend[] {
  const { transactions } = getDataStore();
  if (transactions.length === 0) return [];

  const dates = transactions.map((t) => t.date).sort();
  const latest = new Date(dates.at(-1) as string);
  const sixMonthsAgo = new Date(latest);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twelveMonthsAgo = new Date(latest);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const byDistrict = new Map<string, { recent: number[]; prior: number[]; all: number[] }>();
  for (const t of transactions) {
    const d = new Date(t.date);
    const entry = byDistrict.get(t.district) ?? { recent: [], prior: [], all: [] };
    entry.all.push(t.price_per_sqm);
    if (d >= sixMonthsAgo) entry.recent.push(t.price_per_sqm);
    else if (d >= twelveMonthsAgo) entry.prior.push(t.price_per_sqm);
    byDistrict.set(t.district, entry);
  }

  const results: DistrictPriceTrend[] = [];
  for (const [district, entry] of byDistrict) {
    const recentAvg = mean(entry.recent);
    const priorAvg = mean(entry.prior);
    const momentum = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;
    results.push({
      district,
      avgPricePerSqm: round(mean(entry.all)),
      txnCount: entry.all.length,
      momentumPct: round(momentum, 1),
    });
  }

  return results.sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm).slice(0, limit);
}

export type TopParcel = {
  parcel_id: string;
  district: string;
  development_potential_score: number;
  recommended_use: string;
  estimated_value_aed: number;
  land_use: string;
};

export function topVacantParcels(limit = 5, district?: string): TopParcel[] {
  const { parcels } = getDataStore();
  return parcels
    .filter((p) => p.current_status === 'vacant')
    .filter((p) => (district ? p.district === district : true))
    .sort((a, b) => b.development_potential_score - a.development_potential_score)
    .slice(0, limit)
    .map((p) => ({
      parcel_id: p.parcel_id,
      district: p.district,
      development_potential_score: p.development_potential_score,
      recommended_use: p.recommended_use,
      estimated_value_aed: p.estimated_value_aed,
      land_use: p.land_use,
    }));
}

export type CapitalSupplyRow = { sector: string; mandates: number };

export function capitalSupplyBySector(limit = 10): CapitalSupplyRow[] {
  const { investors } = getDataStore();
  const counts = new Map<string, number>();
  for (const inv of investors) {
    counts.set(inv.preferred_sector, (counts.get(inv.preferred_sector) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([sector, mandates]) => ({ sector, mandates }))
    .sort((a, b) => b.mandates - a.mandates)
    .slice(0, limit);
}

export type ServiceDemandRow = { district: string; avgDemandIndex: number };

export function serviceDemandByDistrict(limit = 5): ServiceDemandRow[] {
  const { communities } = getDataStore();
  const byDistrict = new Map<string, number[]>();
  for (const c of communities) {
    const arr = byDistrict.get(c.district) ?? [];
    arr.push(c.service_demand_index);
    byDistrict.set(c.district, arr);
  }
  return [...byDistrict.entries()]
    .map(([district, values]) => ({ district, avgDemandIndex: round(mean(values)) }))
    .sort((a, b) => b.avgDemandIndex - a.avgDemandIndex)
    .slice(0, limit);
}

/** Comparable transactions for a parcel — used to ground deal memos. */
export function compsForParcel(parcel: Parcel, limit = 8) {
  const { transactions } = getDataStore();
  return transactions
    .filter((t) => t.district === parcel.district)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((t) => ({
      date: t.date,
      asset_type: t.asset_type,
      price_per_sqm: t.price_per_sqm,
      transaction_value_aed: t.transaction_value_aed,
    }));
}

export type PortfolioSummary = {
  districts: number;
  vacantParcels: number;
  totalVacantValueAed: number;
  avgGrossYieldPct: number;
  investorMandates: number;
  transactions: number;
  topMomentumDistrict: { district: string; momentumPct: number } | null;
};

export function portfolioSummary(): PortfolioSummary {
  const { districts, parcels, investors, transactions } = getDataStore();
  const vacant = parcels.filter((p) => p.current_status === 'vacant');
  const trends = priceTrendByDistrict();
  const topMomentum = [...trends].sort((a, b) => b.momentumPct - a.momentumPct)[0];

  return {
    districts: districts.length,
    vacantParcels: vacant.length,
    totalVacantValueAed: vacant.reduce((sum, p) => sum + p.estimated_value_aed, 0),
    avgGrossYieldPct: round(mean(districts.map((d) => d.gross_yield_pct)), 1),
    investorMandates: investors.length,
    transactions: transactions.length,
    topMomentumDistrict: topMomentum
      ? { district: topMomentum.district, momentumPct: topMomentum.momentumPct }
      : null,
  };
}

export function listDistricts() {
  return getDataStore().districts;
}

export function listInvestors() {
  return getDataStore().investors;
}
