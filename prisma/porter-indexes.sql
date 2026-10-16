-- Porter AI: Indexes for document_chunks hybrid search
-- Run after `prisma db push` to create indexes Prisma can't declare.

-- GIN index for BM25 full-text search on tsvector column
CREATE INDEX IF NOT EXISTS idx_document_chunks_search_terms
  ON document_chunks USING GIN (search_terms);

-- HNSW index for approximate nearest neighbor on embedding column
-- Using cosine distance operator class (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index on audit_log for via_porter queries
CREATE INDEX IF NOT EXISTS idx_audit_log_via_porter
  ON audit_log (via_porter) WHERE via_porter = true;

-- Trigger to auto-generate tsvector from content on insert/update
CREATE OR REPLACE FUNCTION document_chunks_search_terms_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_terms := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_chunks_search_terms ON document_chunks;
CREATE TRIGGER trg_document_chunks_search_terms
  BEFORE INSERT OR UPDATE OF content ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION document_chunks_search_terms_trigger();
