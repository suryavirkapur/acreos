import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPriceDropListings, topPriceDropListings } from './price-drop-data';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const listings = loadPriceDropListings(root);
const topListings = topPriceDropListings(listings, 8);
const outputPath = join(root, 'src/lib/price-drops.ts');

const file = `export type HomepagePriceDrop = {
  propertyFinderId: string;
  propertyfinderLink: string;
  title: string;
  propertyType: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: number;
  currentPrice: number;
  currency: string;
  imageUrl: string;
  priceDropCount: number;
  largestTotalDrop: number;
  largestTotalDropPercent: number;
};

export const HOMEPAGE_PRICE_DROPS = ${JSON.stringify(
  topListings.map((listing) => ({
    propertyFinderId: listing.propertyFinderId,
    propertyfinderLink: listing.propertyfinderLink,
    title: listing.title,
    propertyType: listing.propertyType,
    area: listing.area,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    areaSqft: listing.areaSqft,
    currentPrice: listing.currentPrice,
    currency: listing.currency,
    imageUrl: listing.imageUrl,
    priceDropCount: listing.priceDropCount,
    largestTotalDrop: listing.largestTotalDrop,
    largestTotalDropPercent: listing.largestTotalDropPercent,
  })),
)} satisfies HomepagePriceDrop[];
`;

writeFileSync(outputPath, file);

console.log(`Generated ${topListings.length} homepage price-drop listings from ${listings.length} rows.`);
