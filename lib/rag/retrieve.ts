import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embed";
import { seedLyraKnowledgeIfNeeded } from "./seed";

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
): Promise<{ contextText: string; retrievedChunks: RetrievedChunk[] }> {
  try {
    // Automatically seed first if empty
    await seedLyraKnowledgeIfNeeded();

    const embedding = await generateEmbedding(query);
    const supabase = await createServiceClient();

    const { data, error } = await supabase.rpc("match_lyra_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: count,
    });

    if (error || !data?.length) {
      const fallbackChunks: RetrievedChunk[] = FALLBACK_CONTEXT.slice(0, count).map((content, idx) => ({
        id: `fallback-${idx}`,
        content,
        source: "fallback",
        similarity: 1.0,
      }));
      return {
        contextText: FALLBACK_CONTEXT.slice(0, count).join("\n\n"),
        retrievedChunks: fallbackChunks,
      };
    }

    const retrievedChunks = data as RetrievedChunk[];
    const contextText = retrievedChunks.map((c) => c.content).join("\n\n");

    return {
      contextText,
      retrievedChunks,
    };
  } catch (err) {
    console.error("Retrieve error:", err);
    const fallbackChunks: RetrievedChunk[] = FALLBACK_CONTEXT.slice(0, count).map((content, idx) => ({
      id: `fallback-${idx}`,
      content,
      source: "fallback",
      similarity: 1.0,
    }));
    return {
      contextText: FALLBACK_CONTEXT.slice(0, count).join("\n\n"),
      retrievedChunks: fallbackChunks,
    };
  }
}
