"""
Schema de banco de dados para QueryRepository

Este arquivo contém as queries SQL para criar as tabelas necessárias.
Pode ser executado manualmente ou via migration tool.
"""

# SQL para criar tabela de queries
CREATE_QUERIES_TABLE = """
CREATE TABLE IF NOT EXISTS queries (
    id VARCHAR(36) PRIMARY KEY,
    query_text TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'processed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_created_status ON queries(created_at DESC, status);
"""

# SQL para limpar tudo (CUIDADO: destrutivo!)
DROP_QUERIES_TABLE = """
DROP TABLE IF EXISTS queries CASCADE;
"""

# Script de inicialização para desenvolvimento
INIT_DEV_DB = """
-- Criar tabela de queries
CREATE TABLE IF NOT EXISTS queries (
    id VARCHAR(36) PRIMARY KEY,
    query_text TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'processed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_created_status ON queries(created_at DESC, status);

-- Dados de exemplo
INSERT INTO queries (id, query_text, filters, status)
VALUES 
  ('example-1', 'doces até 50', '{"category": "Doces", "price_max": 50.0}', 'processed'),
  ('example-2', 'pizzas', '{"category": "Pizzas"}', 'processed'),
  ('example-3', 'algo errado', '{}', 'failed')
ON CONFLICT DO NOTHING;
"""
