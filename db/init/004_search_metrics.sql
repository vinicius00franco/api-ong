-- Search Metrics Tables
-- Tracking de qualidade e performance das buscas

-- Tabela de métricas de busca
CREATE TABLE IF NOT EXISTS search_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  ai_used BOOLEAN NOT NULL DEFAULT false,
  fallback_applied BOOLEAN NOT NULL DEFAULT false,
  results_count INTEGER NOT NULL DEFAULT 0,
  zero_results BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER NOT NULL,
  user_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de cliques em resultados
CREATE TABLE IF NOT EXISTS search_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_metric_id UUID NOT NULL REFERENCES search_metrics(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_search_metrics_created_at ON search_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_metrics_zero_results ON search_metrics(zero_results) WHERE zero_results = true;
CREATE INDEX IF NOT EXISTS idx_search_metrics_ai_used ON search_metrics(ai_used);
CREATE INDEX IF NOT EXISTS idx_search_clicks_search_metric_id ON search_clicks(search_metric_id);

-- Comentários
COMMENT ON TABLE search_metrics IS 'Métricas de qualidade e performance das buscas';
COMMENT ON TABLE search_clicks IS 'Tracking de cliques em resultados de busca (CTR)';
COMMENT ON COLUMN search_metrics.zero_results IS 'Indica se a busca não retornou resultados (possível erro do LLM)';
COMMENT ON COLUMN search_metrics.latency_ms IS 'Latência total da busca em milissegundos';
