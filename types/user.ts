export type CountryOption =
  | "Togo"
  | "Nigeria"
  | "Ghana"
  | "Benin"
  | "Côte d'Ivoire";

export interface HealthProfile {
  full_name?: string;
  country?: CountryOption;
  date_of_birth?: string;
  sex?: string;
  blood_group?: string;
  weight_kg?: number;
  height_cm?: number;
  chronic_conditions?: string;
  language?: "fr" | "en";
  avatar_url?: string;
}

export interface UserProfile extends HealthProfile {
  id: string;
  email: string;
}
