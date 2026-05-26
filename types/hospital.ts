export type CountryCode =
  | "togo"
  | "nigeria"
  | "ghana"
  | "benin"
  | "cote_divoire"
  | "all";

export interface HospitalProperties {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  phone?: string;
  services: string[];
  opening_hours?: string;
  emergency?: boolean;
  osm_id?: number;
}

export interface HospitalFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: HospitalProperties;
}

export interface HospitalCollection {
  type: "FeatureCollection";
  country?: string;
  features: HospitalFeature[];
}

export interface HospitalWithDistance extends HospitalFeature {
  distanceKm: number;
  bedsEstimate?: number;
}
