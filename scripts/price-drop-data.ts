import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseCsv } from '../src/server/data/csv';

export const PRICE_DROP_CSV = 'silent-glade-45497848_production_neondb_2026-06-26_00-26-15.csv';

export type PriceDropListing = {
  serialNumber: number;
  propertyFinderId: string;
  propertyfinderLink: string;
  title: string;
  propertyType: string;
  area: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: number;
  currentPrice: number;
  currency: string;
  pricePeriod: string;
  imageUrl: string;
  firstSeenAt: string;
  lastSeenAt: string;
  priceDropCount: number;
  latestPriceDropAt: string;
  largestSinglePriceDrop: number;
  largestSinglePriceDropPercent: number;
  largestTotalDrop: number;
  largestTotalDropPercent: number;
};

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: string | undefined): string {
  return value ?? '';
}

export function loadPriceDropListings(root: string): PriceDropListing[] {
  const text = readFileSync(join(root, 'data', PRICE_DROP_CSV), 'utf8');
  return parseCsv(text).map((row) => ({
    serialNumber: num(row.serial_number),
    propertyFinderId: str(row.property_finder_id),
    propertyfinderLink: str(row.propertyfinder_link),
    title: str(row.title),
    propertyType: str(row.property_type),
    area: str(row.area),
    address: str(row.address),
    bedrooms: str(row.bedrooms),
    bathrooms: str(row.bathrooms),
    areaSqft: num(row.area_sqft),
    currentPrice: num(row.current_price),
    currency: str(row.currency) || 'AED',
    pricePeriod: str(row.price_period),
    imageUrl: str(row.image_url),
    firstSeenAt: str(row.first_seen_at),
    lastSeenAt: str(row.last_seen_at),
    priceDropCount: num(row.price_drop_count),
    latestPriceDropAt: str(row.latest_price_drop_at),
    largestSinglePriceDrop: num(row.largest_single_price_drop),
    largestSinglePriceDropPercent: num(row.largest_single_price_drop_percent),
    largestTotalDrop: num(row.largest_total_drop),
    largestTotalDropPercent: num(row.largest_total_drop_percent),
  }));
}

export function topPriceDropListings(listings: PriceDropListing[], limit: number): PriceDropListing[] {
  return listings
    .filter((listing) => listing.largestTotalDrop > 0 && listing.largestTotalDropPercent > 0)
    .sort((a, b) => {
      if (b.largestTotalDropPercent !== a.largestTotalDropPercent) {
        return b.largestTotalDropPercent - a.largestTotalDropPercent;
      }
      return b.largestTotalDrop - a.largestTotalDrop;
    })
    .slice(0, limit);
}
