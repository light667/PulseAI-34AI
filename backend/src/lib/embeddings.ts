export function warmupEmbeddings(): void {
  console.log("✅ Embeddings: HuggingFace API mode (no local model)");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const key = process.env.HUGGINGFACE_API_KEY!;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text.slice(0, 300),
            options: { wait_for_model: true },
          }),
        }
      );

      if (res.status === 503) {
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 35000));
        continue;
      }
      if (!res.ok) throw new Error(`HF ${res.status}`);

      const raw = await res.json() as number[] | number[][];
      return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);

    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("Embedding failed");
}