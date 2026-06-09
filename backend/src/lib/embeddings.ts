// backend/src/lib/embeddings.ts
// HuggingFace API uniquement — pas de modèle local

async function embedHF(text: string): Promise<number[]> {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY!;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text.slice(0, 400),
            options: { wait_for_model: true },
          }),
        }
      );

      if (res.status === 503) {
        await new Promise(r => setTimeout(r, 12000));
        continue;
      }
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);

      const raw = await res.json() as number[] | number[][];
      return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);

    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("Embedding failed");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return embedHF(text);
}

// Warmup no-op — HF API ne nécessite pas de warmup local
export function warmupEmbeddings(): void {
  console.log("✅ Embeddings: HuggingFace API mode (no local model)");
}