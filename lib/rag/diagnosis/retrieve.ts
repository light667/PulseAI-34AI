import { createClient } from "@supabase/supabase-js";
import { embedQuery } from "./embed";
import type { ExtractionResult } from "./extract";

export interface DiseaseMatch {
  disease_name: string;
  symptoms_text: string;
  similarity: number;
  geo_boost: number;
  final_score: number;
  percentage?: number;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or Service Role Key is not configured");
  }
  return createClient(url, key);
}

export async function retrieveDiseases(
  extraction: ExtractionResult
): Promise<DiseaseMatch[]> {
  try {
    const supabase = getServiceClient();

    // 1. Double query retrieval
    // Query A: symptoms_query
    const embeddingA = await embedQuery(extraction.symptoms_query);
    const { data: dataA, error: errorA } = await supabase.rpc("match_diseases", {
      query_embedding: embeddingA,
      match_count: 8,
    });

    if (errorA) {
      throw new Error(`match_diseases A failed: ${errorA.message}`);
    }

    // Query B: raw symptoms list string
    const symptomString = extraction.symptoms_en.join(", ");
    const embeddingB = await embedQuery(symptomString);
    const { data: dataB, error: errorB } = await supabase.rpc("match_diseases", {
      query_embedding: embeddingB,
      match_count: 8,
    });

    if (errorB) {
      throw new Error(`match_diseases B failed: ${errorB.message}`);
    }

    const resultsA = (dataA || []) as DiseaseMatch[];
    const resultsB = (dataB || []) as DiseaseMatch[];

    // 2. Fusion and re-ranking
    const mergedMap = new Map<string, DiseaseMatch>();

    // Put all results from A
    resultsA.forEach((r) => {
      mergedMap.set(r.disease_name.toLowerCase(), { ...r });
    });

    // Merge with B
    resultsB.forEach((r) => {
      const key = r.disease_name.toLowerCase();
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        // Consensus bonus: average(scoreA, scoreB) * 1.15
        const avgSimilarity = (existing.similarity + r.similarity) / 2;
        const avgScore = (existing.final_score + r.final_score) / 2;
        existing.similarity = avgSimilarity;
        existing.final_score = avgScore * 1.15;
      } else {
        mergedMap.set(key, { ...r });
      }
    });

    // Convert map to array, sort by final_score desc, take top 5
    let sortedMatches = Array.from(mergedMap.values())
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 5);

    // Normalize final_score to percentages (sum to 100%)
    const scoreSum = sortedMatches.reduce((sum, match) => sum + match.final_score, 0);
    if (scoreSum > 0) {
      sortedMatches = sortedMatches.map((m) => ({
        ...m,
        percentage: Math.round((m.final_score / scoreSum) * 100),
      }));
    } else {
      sortedMatches = sortedMatches.map((m) => ({
        ...m,
        percentage: Math.round(100 / sortedMatches.length),
      }));
    }

    return sortedMatches;
  } catch (error) {
    console.error("Failed to retrieve diseases:", error);
    return [];
  }
}
