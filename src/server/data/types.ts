export type District = {
  district: string;
  area_type: string;
  profile: string;
  base_sale_aed_sqm: number;
  gross_yield_pct: number;
  infrastructure_score: number;
  latitude: number;
  longitude: number;
  established_year: number;
};

export type Parcel = {
  parcel_id: string;
  district: string;
  zone: string;
  land_use: string;
  parcel_size_sqm: number;
  current_status: string;
  infrastructure_score: number;
  development_potential_score: number;
  estimated_value_aed: number;
  recommended_use: string;
};

export type Investor = {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  preferred_district: string;
  capital_range_aed: string;
  risk_profile: string;
  investment_horizon: string;
  strategic_fit_score: number;
};

export type Transaction = {
  transaction_id: string;
  date: string;
  district: string;
  asset_type: string;
  transaction_value_aed: number;
  size_sqm: number;
  price_per_sqm: number;
  buyer_type: string;
};

export type Amenity = {
  amenity_id: string;
  category: string;
  subtype: string;
  name: string;
  latitude: number;
  longitude: number;
  district: string;
};

export type Community = {
  community_id: string;
  district: string;
  population_estimate: number;
  occupancy_rate: number;
  service_demand_index: number;
  mobility_score: number;
  resident_experience_score: number;
  optimization_opportunity: string;
};
