# Pulse AI v2

AI-powered health intelligence platform for Africa — hackathon prototype.

## Quick start

```bash
npm install
cp .env.example .env.local   # or use existing .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy (Vercel)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables (see `.env.example`)
4. Deploy

## Stack

- Next.js 14 (App Router)
- Tailwind CSS + Framer Motion
- Supabase (Auth, PostgreSQL, pgvector, Storage)
- Groq (LLM, Whisper, Vision)
- MapLibre GL + OpenStreetMap

## Supabase setup

1. Run `supabase/schema.sql` in SQL Editor
2. Enable Google OAuth in Authentication → Providers (optional)
3. Create Storage bucket `medication-scans` (public)
4. Confirm email settings for signup

## Features

- Splash → Onboarding → Auth → Home
- AI Symptom Diagnosis (text + voice)
- Hospital Finder (GeoJSON + map)
- Lyra Mental Health Chat (RAG)
- Medication Scanner (vision)
- Daily Health Tip
- Mobile-first phone-frame layout

## License

Built for Africa Developers Hackathon 2026 — 34AI
