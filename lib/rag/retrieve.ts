import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embed";

export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  similarity: number;
}

const FALLBACK_CONTEXT = [
  "Prendre quelques respirations profondes peut aider à calmer l'anxiété immédiate.",
  "Parler à une personne de confiance est un premier pas important pour la santé mentale.",
  "Le sommeil régulier (7-8h) améliore l'humeur et la résilience au stress.",
  "En Afrique de l'Ouest, la stigmatisation autour de la santé mentale est réelle — demander de l'aide est courageux.",
  "Des activités simples (marche, musique, prière/méditation) peuvent stabiliser l'humeur.",
];

export async function retrieveLyraContext(
  query: string,
  count = 5
): Promise<string> {
  try {
    const embedding = await generateEmbedding(query);
    const supabase = await createServiceClient();

    const { data, error } = await supabase.rpc("match_lyra_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: count,
    });

    if (error || !data?.length) {
      return FALLBACK_CONTEXT.slice(0, count).join("\n\n");
    }

    return (data as RetrievedChunk[])
      .map((c) => c.content)
      .join("\n\n");
  } catch {
    return FALLBACK_CONTEXT.slice(0, count).join("\n\n");
  }
}
