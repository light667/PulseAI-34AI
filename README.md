<div align="center">

<br/>

```
██████╗ ██╗   ██╗██╗     ███████╗███████╗     █████╗ ██╗
██╔══██╗██║   ██║██║     ██╔════╝██╔════╝    ██╔══██╗██║
██████╔╝██║   ██║██║     ███████╗█████╗      ███████║██║
██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝      ██╔══██║██║
██║     ╚██████╔╝███████╗███████║███████╗    ██║  ██║██║
╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝    ╚═╝  ╚═╝╚═╝
```

**AI-Powered Health Intelligence for Every African**

*Built for Africa. Not adapted for Africa.*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-00FF87.svg?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Mistral AI](https://img.shields.io/badge/LLM-Mistral_AI-orange?style=for-the-badge)](https://mistral.ai/)
[![Groq](https://img.shields.io/badge/Inference-Groq-red?style=for-the-badge)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

<br/>

> **Africa Developers Hackathon 2026 — Submission by Team 34AI**
> 
> *2.5 million preventable deaths occur every year in Sub-Saharan Africa.*
> *Pulse AI exists to change that number.*

<br/>

</div>

---

## The Problem We Are Solving

Every year, millions of Africans reach the wrong hospital, take counterfeit medication, or never seek mental health support — not because care does not exist, but because the infrastructure connecting patients to that care has never been built.

Pulse AI is that infrastructure.

---

## What Pulse AI Delivers

**AI Symptom Diagnosis** — Patients describe symptoms in natural language (text or voice, in French or English). Groq extracts structured clinical signals. A CSV-based disease matching engine scores 770+ disease profiles against those signals with geographic prevalence weighting for West Africa. Mistral synthesizes a ranked differential diagnosis with severity triage and first-aid guidance — in under 10 seconds.

**Smart Hospital Finder** — Real GPS-to-hospital routing across 8 West African countries using OSRM road distance (not straight-line estimates). Filter by country, service type, or specialty. Falls back gracefully to manual country selection when GPS is unavailable.

**Lyra — Mental Health Companion** — A culturally-aware AI therapist powered by Mistral + RAG (Supabase pgvector). Lyra retrieves relevant mental health context from a curated West African corpus on every message, responds with streaming tokens, and maintains full conversation history. She speaks both French and English, understands stigma, and provides crisis resources when needed.

**Medication Scanner** — Computer vision analysis of drug packaging to verify authenticity, explain treatment purpose, and flag interactions — built for the counterfeit drug crisis in West Africa.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT                                  │
│              Text / Voice / Photo input                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Next.js 14 Frontend │  Vercel Edge
          │   (App Router + SSR)  │
          └───────────┬───────────┘
                      │  REST API calls
          ┌───────────▼───────────┐
          │   Express Backend     │  Render (Frankfurt)
          │                       │
          │  ┌─────────────────┐  │
          │  │ /diagnose       │  │  Groq Llama 3.3-70b
          │  │  NLP extraction │──┼──► symptom extraction
          │  │  CSV Matching   │  │   770 diseases × geo boost
          │  │  Mistral Synth  │──┼──► differential diagnosis
          │  └─────────────────┘  │
          │                       │
          │  ┌─────────────────┐  │
          │  │ /lyra           │  │  HuggingFace Embeddings
          │  │  HF Embeddings  │──┼──► 384-dim vectors
          │  │  pgvector RAG   │──┼──► Supabase similarity search
          │  │  Mistral Stream │──┼──► SSE streaming response
          │  └─────────────────┘  │
          │                       │
          │  ┌─────────────────┐  │
          │  │ /hospitals      │  │  GeoJSON + OSRM routing
          │  │  GeoJSON Loader │──┼──► 8 countries loaded in memory
          │  │  OSRM Distance  │──┼──► real road distance & duration
          │  └─────────────────┘  │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │   Supabase            │
          │   PostgreSQL          │
          │   + pgvector          │
          │   lyra_knowledge      │
          │   lyra_conversations  │
          │   disease_embeddings  │
          │   diagnoses           │
          └───────────────────────┘
```

---

## Diagnosis Pipeline — How It Works

```
User input (FR/EN/Ewe/Hausa/Yoruba)
          │
          ▼
[Groq Llama 3.3-70b]  ← extracts structured symptom list
          │
          ▼
[In-memory CSV Matcher]  ← Jaccard similarity against 770+ disease profiles
          │              ← Geographic prevalence boost (malaria ×1.9, typhoid ×1.7...)
          │
          ▼
[Top 5 candidates with % scores]
          │
          ▼
[Mistral mistral-small-latest]  ← synthesizes differential diagnosis
          │                     ← applies clinical reasoning
          │                     ← generates severity, first aid, disclaimers
          ▼
Ranked result in user's language — in under 10 seconds
```

---

## Lyra RAG Pipeline

```
User message
      │
      ▼
[HuggingFace all-MiniLM-L6-v2]  ← 384-dim embedding
      │
      ▼
[Supabase match_lyra_knowledge()]  ← cosine similarity, top 4 chunks
      │
      ▼
[Mistral mistral-medium-latest]  ← enriched system prompt + RAG context
      │                          ← streaming SSE response
      ▼
Token-by-token response to client
```

---

## Countries Covered

| Country | Flag | Hospital Data | Status |
|:--------|:----:|:-------------:|:------:|
| Togo | 🇹🇬 | `togo_hospitals.geojson` | ✅ Live |
| Bénin | 🇧🇯 | `benin_hospitals.geojson` | ✅ Live |
| Ghana | 🇬🇭 | `ghana_hospitals.geojson` | ✅ Live |
| Côte d'Ivoire | 🇨🇮 | `ivory_coast_hospitals.geojson` | ✅ Live |
| Nigeria | 🇳🇬 | `nigeria_hospitals.geojson` | ✅ Live |
| Burkina Faso | 🇧🇫 | `burkina_faso_hospitals.geojson` | ✅ Live |
| Niger | 🇳🇪 | `niger_hospitals.geojson` | ✅ Live |
| Mali | 🇲🇱 | `mali_hospitals.geojson` | ✅ Live |

Hospital data sourced from OpenStreetMap via Overpass API. Road distances computed in real time via OSRM public instance — no API key required.

---

## Tech Stack — 100% Free Tier

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Frontend | Next.js 14 App Router | SSR, routing, API proxy |
| Styling | Tailwind CSS + CSS Variables | Dark/light theme system |
| Animations | Framer Motion | Page transitions, staggered lists |
| Map | React Leaflet + OpenStreetMap | Hospital map, user location |
| Routing | OSRM public instance | Real road distances |
| Backend | Express.js on Render | API, business logic |
| LLM — Diagnosis | Mistral `mistral-small-latest` | Fast differential synthesis |
| LLM — Lyra | Mistral `mistral-medium-latest` | Empathetic therapy responses |
| NLP Extraction | Groq `llama-3.3-70b-versatile` | Symptom extraction from text |
| Voice | Groq Whisper | Audio transcription |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` | 384-dim vectors for RAG |
| Vector DB | Supabase pgvector | Lyra knowledge similarity search |
| Database | Supabase PostgreSQL | History, conversations |
| Auth | Firebase Auth | Email + Google OAuth |
| State | Zustand (persisted) | Global language, health profile |
| Deployment | Vercel (frontend) + Render (backend) | Production |

---

## Repository Structure

```
PulseAI-34AI/
├── app/
│   ├── (app)/                    # Authenticated pages
│   │   ├── dashboard/            # Health overview, daily tip, quick actions
│   │   ├── diagnostic/           # AI symptom checker
│   │   ├── hospitals/            # GPS hospital finder with map
│   │   ├── lyra/                 # Mental health chat interface
│   │   ├── scan/                 # Medication scanner
│   │   └── profile/              # User health profile
│   └── api/
│       ├── diagnose/route.ts     # Proxy → backend /diagnose
│       ├── hospitals/route.ts    # Proxy → backend /hospitals/search
│       ├── lyra/route.ts         # Proxy → backend /lyra (SSE stream)
│       └── auth/token/route.ts   # Firebase token validation
├── backend/
│   ├── src/
│   │   ├── server.ts             # Express entry point
│   │   ├── routes/
│   │   │   ├── diagnose.ts       # Groq extraction + CSV match + Mistral
│   │   │   ├── lyra.ts           # RAG retrieval + Mistral streaming
│   │   │   ├── hospitals.ts      # GeoJSON search + OSRM routing
│   │   │   └── ingest.ts         # Disease CSV ingestion (one-shot)
│   │   └── lib/
│   │       ├── csvMatcher.ts     # In-memory Jaccard disease scoring
│   │       ├── embeddings.ts     # HuggingFace API wrapper
│   │       ├── hospitalLoader.ts # GeoJSON parser + normalizer
│   │       └── routing.ts        # OSRM batch distance calculator
├── Hospital_Data/                # GeoJSON files for 8 countries
├── public/
│   └── data/
│       └── data_symptom.csv      # 770+ disease × symptom matrix
├── components/                   # Reusable React components
├── lib/
│   ├── store/useHealthStore.ts   # Zustand global state (language, profile)
│   ├── services/                 # API fetchers
│   └── i18n/                     # Translation strings (FR/EN)
├── styles/globals.css            # Design tokens (dark + light theme)
├── render.yaml                   # Render deployment config
└── vercel.json                   # Vercel deployment config
```

---

## Environment Variables

Create `.env.local` at the project root:

```env
# LLM — Diagnosis + Lyra
MISTRAL_API_KEY=your_mistral_key

# NLP Extraction + Voice Transcription
GROQ_API_KEY=your_groq_key

# Embeddings (RAG)
HUGGINGFACE_API_KEY=your_hf_key

# Supabase — Vector DB + History
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase — Authentication
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Backend URL (set in Vercel dashboard)
NEXT_PUBLIC_BACKEND_URL=https://pulseai-backend-dr6f.onrender.com

# Backend only (.env in /backend)
INGEST_SECRET=your_ingest_secret
```

---

## Supabase Setup

Run this SQL in your Supabase SQL Editor before first deployment:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Lyra RAG knowledge base
CREATE TABLE IF NOT EXISTS lyra_knowledge (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content    TEXT NOT NULL,
  source     VARCHAR(255),
  category   VARCHAR(100),
  embedding  vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lyra_knowledge_vec_idx
  ON lyra_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 30);

-- Lyra conversation history (Firebase UID as TEXT)
CREATE TABLE IF NOT EXISTS lyra_conversations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE,
  messages   JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disease embeddings (for optional pgvector diagnosis mode)
CREATE TABLE IF NOT EXISTS disease_embeddings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_name  VARCHAR(255) NOT NULL UNIQUE,
  symptoms_text TEXT NOT NULL,
  rich_text     TEXT NOT NULL,
  symptom_list  JSONB,
  geo_boost     FLOAT DEFAULT 1.0,
  embedding     vector(384),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Lyra similarity search function
CREATE OR REPLACE FUNCTION match_lyra_knowledge(
  query_embedding vector(384),
  match_threshold FLOAT,
  match_count     INT
) RETURNS TABLE (id UUID, content TEXT, source VARCHAR, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, source,
    1 - (embedding <=> query_embedding) AS similarity
  FROM lyra_knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/light667/PulseAI-34AI.git
cd PulseAI-34AI

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Configure environment
cp .env.example .env.local
# Fill in your API keys

# 5. Start both servers (two terminals)
npm run dev                          # Frontend on :3000
cd backend && npm run dev            # Backend on :5000
```

---

## Production Deployment

**Frontend — Vercel**

```bash
vercel --prod
```

Set `NEXT_PUBLIC_BACKEND_URL` in Vercel Dashboard → Settings → Environment Variables.

**Backend — Render**

Render auto-deploys from `main` branch using `render.yaml`. Set secrets in Render Dashboard → Environment:

```
MISTRAL_API_KEY
GROQ_API_KEY
HUGGINGFACE_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
INGEST_SECRET
```

**Seed Lyra corpus** (run once after backend deployment):

```bash
curl -X POST "https://your-backend.onrender.com/lyra/seed" \
  -H "x-ingest-secret: your_secret" \
  -H "Content-Type: application/json"

# Verify
curl "https://your-backend.onrender.com/lyra/status"
# → {"corpus_count": 20, "ready": true}
```

**Verify hospitals loaded:**

```bash
curl "https://your-backend.onrender.com/hospitals/status"
# → {"total": 2500+, "byCountry": {"Togo": 120, "Ghana": 340, ...}}
```

> **Note on Render free tier:** The backend sleeps after 15 minutes of inactivity. The first request after sleep takes 30–60 seconds to wake up. The frontend displays a user-friendly "Server is waking up — try again in a moment" message with a retry button during this period.

---

## Key Design Decisions

**Why in-memory CSV matching instead of pgvector for diagnosis?**
Render free tier has a 256MB RAM limit. Loading a transformer model locally (Xenova/transformers) consumes 240MB+ and crashes the process. The Jaccard-based in-memory matcher uses under 30MB, loads in milliseconds from the GeoJSON file already on disk, achieves comparable accuracy for structured binary symptom data, and requires zero external API calls for the matching step itself.

**Why geographic prevalence boosting?**
Raw symptom matching treats malaria the same as appendicitis. In Togo, malaria has a 1.9× prevalence multiplier applied post-match. This single layer of epidemiological context dramatically improves triage accuracy for West African patients without requiring a medical ontology.

**Why Mistral for synthesis instead of using Groq end-to-end?**
Groq (Llama 3.3) is used for extraction because it is the fastest model available for structured JSON output. Mistral is used for synthesis because `response_format: json_object` guarantees valid JSON output — critical when the result drives clinical UI rendering.

**Why OSRM instead of Google Maps?**
Zero cost, zero API key, and OSRM covers West African road networks accurately from OpenStreetMap data. Batch requests (up to 25 destinations per HTTP call) keep latency under 2 seconds for a full hospital list.

---

## Impact Numbers

| Metric | Value |
|:-------|:------|
| Preventable deaths/year in Sub-Saharan Africa | 2.5 million |
| Countries with live hospital data | 8 |
| Hospital records loaded in memory | 2,500+ |
| Disease profiles in diagnosis engine | 770+ |
| Languages supported | 6 (FR, EN, Ewe, Hausa, Yoruba, Twi) |
| Diagnosis response time | < 10 seconds |
| Lyra RAG corpus chunks | 20 curated mental health documents |
| Cost to patient | $0 |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with purpose by **Team 34AI** for the **Africa Developers Hackathon 2026**

*"Pulse AI is not an application.*
*It is an AI-powered health coordination infrastructure — built for Africa."*

</div>