const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return fallbackEmbedding(text);
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!response.ok) {
    return fallbackEmbedding(text);
  }

  const result = await response.json();
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[];
  }
  if (Array.isArray(result) && typeof result[0] === "number") {
    return result as number[];
  }
  return fallbackEmbedding(text);
}

function fallbackEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 384] += text.charCodeAt(i) / 1000;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
