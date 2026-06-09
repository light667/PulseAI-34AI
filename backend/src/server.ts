import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import diagnoseRouter from "./routes/diagnose";
import ingestRouter from "./routes/ingest";
import lyraRouter, { seedLyraCorpusIfEmpty } from "./routes/lyra";
import { warmupEmbeddings } from "./lib/embeddings";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// CORS — tout autoriser pour le hackathon
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", "Authorization",
    "x-ingest-secret", "x-user-id",
  ],
}));
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "PulseAI Backend",
    timestamp: new Date().toISOString(),
    env: {
      MISTRAL: !!process.env.MISTRAL_API_KEY,
      GROQ: !!process.env.GROQ_API_KEY,
      HF: !!process.env.HUGGINGFACE_API_KEY,
      Supabase: !!process.env.SUPABASE_URL,
    },
  });
});

app.use("/diagnose", diagnoseRouter);
app.use("/ingest", ingestRouter);
app.use("/lyra", lyraRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`\n🚀  PulseAI Backend on port ${PORT}`);
  console.log(`   MISTRAL=${!!process.env.MISTRAL_API_KEY} | GROQ=${!!process.env.GROQ_API_KEY} | HF=${!!process.env.HUGGINGFACE_API_KEY} | Supabase=${!!process.env.SUPABASE_URL}\n`);

  // Précharger le modèle d'embedding en arrière-plan
  warmupEmbeddings();

  // Seed Lyra après que le modèle soit prêt (délai 30s)
  setTimeout(async () => {
    await seedLyraCorpusIfEmpty();
  }, 30000);
});