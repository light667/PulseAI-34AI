// backend/src/lib/embeddings.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
let _pipeline: any = null;
let _loading = false;
let _loadPromise: Promise<any> | null = null;

async function getPipeline(): Promise<any> {
  if (_pipeline) return _pipeline;

  // Éviter les chargements parallèles
  if (_loading && _loadPromise) return _loadPromise;

  _loading = true;
  _loadPromise = (async () => {
    try {
      const { pipeline, env } = await import("@xenova/transformers") as any;

      // Cache local dans /tmp pour Render
      env.cacheDir = "/tmp/xenova-cache";
      env.localModelPath = "/tmp/xenova-cache";

      console.log("⏳ Loading embedding model...");
      _pipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { quantized: true }
      );
      console.log("✅ Embedding model ready");
      return _pipeline;
    } catch (err) {
      _loading = false;
      _loadPromise = null;
      throw err;
    }
  })();

  return _loadPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text.slice(0, 512), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data) as number[];
}

// Précharger le modèle au démarrage (non-bloquant)
export function warmupEmbeddings(): void {
  getPipeline()
    .then(() => console.log("🔥 Embeddings warmed up"))
    .catch((err: Error) => console.error("Warmup failed:", err.message));
}