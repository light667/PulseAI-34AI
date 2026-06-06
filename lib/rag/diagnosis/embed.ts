const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  let attempt = 0;
  const maxAttempts = 3;
  let delay = 1000; // start with 1s

  while (attempt < maxAttempts) {
    try {
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
        const errText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      
      // Flatten result if nested array (e.g. [[value, value, ...]])
      if (Array.isArray(result)) {
        if (Array.isArray(result[0])) {
          return result[0].flat() as number[];
        }
        return result as number[];
      }
      throw new Error("Invalid embedding response structure");
    } catch (error) {
      attempt++;
      console.warn(`Embedding attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`);
      if (attempt >= maxAttempts) {
        throw error;
      }
      await sleep(delay);
      delay *= 2; // exponential backoff: 1s, 2s, 4s
    }
  }

  throw new Error("Unexpected embedding extraction failure");
}
