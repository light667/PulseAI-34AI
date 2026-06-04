export type CountryCode =
  | "togo"
  | "niger"
  | "mali"
  | "cote_divoire"
  | "ghana"
  | "burkina_faso"
  | "benin"
  | "all";

export interface HospitalProperties {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  phone?: string;
  services: string[];
  specialties: string[];
  emergency: boolean;
  latitude: number;
  longitude: number;
  opening_hours?: string;
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
  distance: number;
  bedsEstimate?: number;
}
