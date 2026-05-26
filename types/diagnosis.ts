export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DiagnosisCondition {
  name: string;
  probability: number;
  description: string;
  recommendation: string;
}

export interface DiagnosisResult {
  conditions: DiagnosisCondition[];
  severity: SeverityLevel;
  severityScore: number;
  severityMessage: string;
  firstAid: string[];
  doNots: string[];
  disclaimer: string;
}

export interface DiagnosisRequest {
  symptoms: string;
  language: string;
  age?: number;
  sex?: string;
  context?: string;
}
