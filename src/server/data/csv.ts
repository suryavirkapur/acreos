import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  Amenity,
  Community,
  District,
  Investor,
  Parcel,
  Transaction,
} from '@/server/data/types';

/**
 * Minimal CSV parser. Handles quoted fields with embedded commas/quotes.
 * The challenge datasets are simple, but quoting is supported for safety.
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? '';
    });
    return record;
  });
}

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadCsv(dataDir: string, filename: string): Array<Record<string, string>> {
  const path = join(dataDir, filename);
  const text = readFileSync(path, 'utf8');
  return parseCsv(text);
}

export type DataStore = {
  districts: District[];
  parcels: Parcel[];
  investors: Investor[];
  transactions: Transaction[];
  communities: Community[];
  amenities: Amenity[];
};

export function loadDataStoreFromDir(dataDir: string): DataStore {
  const districts: District[] = loadCsv(dataDir, 'districts.csv').map((r) => ({
    district: r.district,
    area_type: r.area_type,
    profile: r.profile,
    base_sale_aed_sqm: num(r.base_sale_aed_sqm),
    gross_yield_pct: num(r.gross_yield_pct),
    infrastructure_score: num(r.infrastructure_score),
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    established_year: num(r.established_year),
  }));

  const parcels: Parcel[] = loadCsv(dataDir, 'sample_parcels.csv').map((r) => ({
    parcel_id: r.parcel_id,
    district: r.district,
    zone: r.zone,
    land_use: r.land_use,
    parcel_size_sqm: num(r.parcel_size_sqm),
    current_status: r.current_status,
    infrastructure_score: num(r.infrastructure_score),
    development_potential_score: num(r.development_potential_score),
    estimated_value_aed: num(r.estimated_value_aed),
    recommended_use: r.recommended_use,
  }));

  const investors: Investor[] = loadCsv(dataDir, 'sample_investors.csv').map((r) => ({
    investor_id: r.investor_id,
    investor_type: r.investor_type,
    preferred_sector: r.preferred_sector,
    preferred_district: r.preferred_district,
    capital_range_aed: r.capital_range_aed,
    risk_profile: r.risk_profile,
    investment_horizon: r.investment_horizon,
    strategic_fit_score: num(r.strategic_fit_score),
  }));

  const transactions: Transaction[] = loadCsv(dataDir, 'sample_transactions.csv').map((r) => ({
    transaction_id: r.transaction_id,
    date: r.date,
    district: r.district,
    asset_type: r.asset_type,
    transaction_value_aed: num(r.transaction_value_aed),
    size_sqm: num(r.size_sqm),
    price_per_sqm: num(r.price_per_sqm),
    buyer_type: r.buyer_type,
  }));

  const communities: Community[] = loadCsv(dataDir, 'sample_communities.csv').map((r) => ({
    community_id: r.community_id,
    district: r.district,
    population_estimate: num(r.population_estimate),
    occupancy_rate: num(r.occupancy_rate),
    service_demand_index: num(r.service_demand_index),
    mobility_score: num(r.mobility_score),
    resident_experience_score: num(r.resident_experience_score),
    optimization_opportunity: r.optimization_opportunity,
  }));

  const amenities: Amenity[] = loadCsv(dataDir, 'osm_amenities.csv').map((r) => ({
    amenity_id: r.amenity_id,
    category: r.category,
    subtype: r.subtype,
    name: r.name,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    district: r.district,
  }));

  return { districts, parcels, investors, transactions, communities, amenities };
}
