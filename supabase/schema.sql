-- Pulse AI v2 — Supabase Schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS vector;

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  country TEXT,
  date_of_birth TEXT,
  sex TEXT,
  blood_group TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  chronic_conditions TEXT,
  language TEXT DEFAULT 'fr',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING ((auth.jwt() ->> 'sub') = id);

-- Diagnoses history
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  symptoms TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  result JSONB NOT NULL,
  top_condition VARCHAR(255),
  severity VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own diagnoses" ON diagnoses
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id);

-- Lyra knowledge base (RAG)
CREATE TABLE IF NOT EXISTS lyra_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source VARCHAR(255),
  category VARCHAR(100),
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search
CREATE OR REPLACE FUNCTION match_lyra_knowledge(
  query_embedding vector(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id UUID, content TEXT, source VARCHAR, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, source, 1 - (embedding <=> query_embedding) AS similarity
  FROM lyra_knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Lyra conversations
CREATE TABLE IF NOT EXISTS lyra_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lyra_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own conversations" ON lyra_conversations
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id);

-- Storage bucket for medication scans (create in Supabase Dashboard)
-- Name: medication-scans, Public: true
