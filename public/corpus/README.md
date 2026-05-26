# Medical Corpus (Lyra RAG)

Add plain text or markdown files here for mental health RAG ingestion.

## Suggested documents

- WHO Africa mental health action plan (excerpts)
- Anxiety management (CBT-based)
- Depression support guide
- Stress and burnout recovery
- Sleep hygiene guide
- Grief and loss support
- African cultural context for mental health stigma

## Ingest

1. Add `HUGGINGFACE_API_KEY` to `.env.local`
2. Run Supabase SQL from `supabase/schema.sql`
3. Run: `npm run ingest`

Place `.txt` or `.md` files in this folder before running ingest.
