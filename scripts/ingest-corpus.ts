/**
 * Ingest mental health corpus into Supabase pgvector
 * Run: npm run ingest
 * Requires: HUGGINGFACE_API_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { generateEmbedding } from "../lib/rag/embed";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORPUS_DIR = path.join(process.cwd(), "public", "corpus");

function chunkText(text: string, size = 500): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + p).length > size && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function ingestFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath);
  const chunks = chunkText(content);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    const { error } = await supabase.from("lyra_knowledge").insert({
      content: chunk,
      source: name,
      category: "mental_health",
      embedding,
    });
    if (error) console.error(`Error ingesting chunk from ${name}:`, error.message);
    else console.log(`✓ ${name} chunk ingested`);
  }
}

async function main() {
  if (!fs.existsSync(CORPUS_DIR)) {
    console.log("Create public/corpus/ and add .txt or .md files first.");
    return;
  }
  const files = fs
    .readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith(".txt") || f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No .txt or .md files in public/corpus/");
    return;
  }

  for (const file of files) {
    await ingestFile(path.join(CORPUS_DIR, file));
  }
  console.log("Ingestion complete.");
}

main().catch(console.error);
