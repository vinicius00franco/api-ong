-- Full-Text Search Optimization
-- Adiciona coluna tsvector e índice GIN para busca rápida

-- Adicionar coluna search_vector
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Criar função para atualizar search_vector
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente
DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_vector_update();

-- Atualizar produtos existentes
UPDATE products SET search_vector = 
  setweight(to_tsvector('portuguese', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('portuguese', COALESCE(description, '')), 'B');

-- Criar índice GIN para busca rápida
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);

-- Comentários
COMMENT ON COLUMN products.search_vector IS 'Vetor de busca full-text (tsvector) para performance';
COMMENT ON INDEX idx_products_search_vector IS 'Índice GIN para busca full-text 10-100x mais rápida que ILIKE';
