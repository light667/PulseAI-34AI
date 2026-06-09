-- ============================================================
-- Pulse AI v2 — Disease Embeddings (RAG Diagnostic)
-- Run this in Supabase SQL Editor BEFORE ingesting the CSV
-- ============================================================

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table: disease_embeddings
-- Stores each disease with its averaged symptom embedding (384-dim)
-- and geo-boost factor for West Africa context
-- ============================================================
CREATE TABLE IF NOT EXISTS disease_embeddings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_name  TEXT NOT NULL,
  symptoms_text TEXT NOT NULL,         -- comma-separated list of symptoms
  rich_text     TEXT,                  -- enriched sentence for context
  symptom_list  TEXT[],               -- array form of symptoms
  geo_boost     FLOAT DEFAULT 1.0,    -- prevalence boost for West Africa
  embedding     vector(384) NOT NULL,  -- averaged dual embedding
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast approximate nearest-neighbor search (IVFFlat)
CREATE INDEX IF NOT EXISTS disease_embeddings_embedding_idx
  ON disease_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Unique index on disease_name to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS disease_embeddings_name_idx
  ON disease_embeddings (LOWER(disease_name));

-- ============================================================
-- Function: match_diseases
-- Vector similarity search with geo_boost weighting
-- Returns top-N diseases ranked by (cosine_similarity * geo_boost)
-- ============================================================
CREATE OR REPLACE FUNCTION match_diseases(
  query_embedding vector(384),
  match_count     INT DEFAULT 8
)
RETURNS TABLE (
  disease_name  TEXT,
  symptoms_text TEXT,
  similarity    FLOAT,
  geo_boost     FLOAT,
  final_score   FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    de.disease_name,
    de.symptoms_text,
    (1 - (de.embedding <=> query_embedding))              AS similarity,
    de.geo_boost,
    (1 - (de.embedding <=> query_embedding)) * de.geo_boost AS final_score
  FROM disease_embeddings de
  WHERE (1 - (de.embedding <=> query_embedding)) > 0.20
  ORDER BY final_score DESC
  LIMIT match_count;
$$;

-- Grant execute rights to service role and anon
GRANT EXECUTE ON FUNCTION match_diseases TO service_role;
GRANT EXECUTE ON FUNCTION match_diseases TO anon;
GRANT EXECUTE ON FUNCTION match_diseases TO authenticated;

-- Grant table access
GRANT SELECT ON disease_embeddings TO service_role;
GRANT SELECT ON disease_embeddings TO anon;
GRANT SELECT ON disease_embeddings TO authenticated;
