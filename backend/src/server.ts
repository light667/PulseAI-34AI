import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import diagnoseRouter from "./routes/diagnose";
import ingestRouter from "./routes/ingest";
import lyraRouter from "./routes/lyra";
import hospitalsRouter from "./routes/hospitals";
import { preloadDiseases } from "./lib/csvMatcher";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

app.use(cors({ origin: true, credentials: true, methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization","x-ingest-secret","x-user-id"] }));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: { MISTRAL: !!process.env.MISTRAL_API_KEY, GROQ: !!process.env.GROQ_API_KEY, Supabase: !!process.env.SUPABASE_URL } });
});

app.use("/diagnose", diagnoseRouter);
app.use("/ingest", ingestRouter);
app.use("/lyra", lyraRouter);
app.use("/hospitals", hospitalsRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀  PulseAI Backend on port ${PORT}`);
  console.log(`   MISTRAL=${!!process.env.MISTRAL_API_KEY} | GROQ=${!!process.env.GROQ_API_KEY} | Supabase=${!!process.env.SUPABASE_URL}\n`);
  // Précharger le CSV en mémoire (léger ~2MB)
  preloadDiseases();
});