# 🧪 TDD: QueryRepository com SQL

## 📋 Visão Geral

Refatoração do `QueryRepository` para usar **PostgreSQL com prepared statements** em vez de armazenamento em memória.

### ✅ Red-Green-Refactor

**RED (Testes falham):**
- 24 testes criados em `tests/test_query_repository_sql.py`
- Testes cobrem operações CRUD, segurança e performance

**GREEN (Código mínimo):**
- Implementação em `llm_api/repositories/query_repository.py`
- Schema do banco em `llm_api/repositories/schema.py`
- Main.py atualizado com pool de conexões

**REFACTOR:**
- Melhorar tratamento de erros
- Adicionar migrations automáticas (em progresso)

## 🏗️ Estrutura Criada

```
llm-api/
├── llm_api/
│   └── repositories/
│       ├── base.py                 # Interface IQueryRepository (existente)
│       ├── query_repository.py     # ✨ Refatorado para SQL com asyncpg
│       ├── mock_repository.py      # Mock (existente)
│       └── schema.py               # 🆕 Schema PostgreSQL
├── tests/
│   └── test_query_repository_sql.py # 🆕 24 testes TDD
├── main.py                          # ✨ Refatorado com pool asyncpg
└── requirements.txt                 # ✨ Adicionado asyncpg==0.29.0
```

## 🔐 Segurança

### Prepared Statements (Parametrized Queries)

Todos os valores são passados como parâmetros, **nunca** concatenados:

```python
# ❌ NUNCA (SQL Injection)
query = f"SELECT * FROM queries WHERE id = '{user_input}'"

# ✅ SEMPRE (Seguro)
await conn.fetchrow(
    "SELECT * FROM queries WHERE id = $1",
    user_input  # Parametrizado, não interpretado como SQL
)
```

### Proteção contra SQL Injection

Os testes validam:

```python
async def test_get_query_by_id_safe_from_sql_injection(self, repository):
    """Deve ser seguro contra SQL injection"""
    malicious_id = "'; DROP TABLE queries; --"
    result = await repository.get_query_by_id(malicious_id)
    
    # Não quebra, tabela permanece
    assert result is None
```

### JSONB para Filtros

Filtros são armazenados como **JSONB**, não como strings:

```sql
INSERT INTO queries (id, query_text, filters, ...)
VALUES ($1, $2, $3::jsonb, ...)
```

Benefícios:
- ✅ Validação de JSON automática no banco
- ✅ Índices em campos JSON
- ✅ Queries complexas com `->` e `@>`

## 📊 Testes Implementados

### Testes de `save_query` (5 testes)

```python
✓ test_save_query_returns_valid_id
✓ test_save_query_persists_in_database
✓ test_save_query_stores_filters_as_json
✓ test_save_query_sets_created_at_timestamp
✓ test_save_query_multiple_calls_different_ids
```

### Testes de `get_query_history` (5 testes)

```python
✓ test_get_query_history_returns_list
✓ test_get_query_history_returns_saved_queries
✓ test_get_query_history_ordered_by_created_at_desc
✓ test_get_query_history_respects_limit
✓ test_get_query_history_default_limit
```

### Testes de `get_query_by_id` (4 testes)

```python
✓ test_get_query_by_id_returns_query
✓ test_get_query_by_id_returns_none_for_missing
✓ test_get_query_by_id_includes_all_fields
✓ test_get_query_by_id_safe_from_sql_injection
```

### Testes de `update_query_status` (3 testes)

```python
✓ test_update_query_status_changes_status
✓ test_update_query_status_returns_false_for_missing
✓ test_update_query_status_safe_from_injection
```

### Testes de Segurança e Performance (4 testes)

```python
✓ test_special_characters_in_query_text
✓ test_large_json_filters
✓ test_concurrent_saves
```

### Testes de Inicialização (2 testes)

```python
✓ test_init_with_db_pool
✓ test_init_creates_tables_on_first_use
```

## 🚀 Como Executar os Testes

### Opção 1: Docker Compose (Recomendado)

```bash
# Com docker-compose já rodando
docker-compose exec llm-api-tests pytest tests/test_query_repository_sql.py -v

# Ou com profile de testes
docker-compose --profile test up llm-api-tests
```

### Opção 2: Localmente (com PostgreSQL rodando)

```bash
# Instalar dependências
pip install -r requirements-test.txt

# Rodar testes
pytest tests/test_query_repository_sql.py -v

# Com coverage
pytest tests/test_query_repository_sql.py -v --cov=llm_api.repositories --cov-report=html
```

### Opção 3: Makefile

```bash
# Ver comandos disponíveis
cat Makefile

# Rodar testes SQL
make test
```

## 📈 Cobertura Esperada

```
llm_api/repositories/query_repository.py:
  save_query: 100% ✅
  get_query_history: 100% ✅
  get_query_by_id: 100% ✅
  update_query_status: 100% ✅
  _generate_id: 100% ✅
```

**Target: 80%+ cobertura** (conforme AGENTS.md)

## 🔄 Fluxo TDD Executado

### 1. RED (Testes Criados)
```python
# tests/test_query_repository_sql.py
@pytest.mark.asyncio
async def test_save_query_returns_valid_id(repository):
    query_id = await repository.save_query("doces", {...})
    assert query_id is not None  # FALHA (implementação em memória)
```

### 2. GREEN (Implementação Mínima)
```python
# llm_api/repositories/query_repository.py
async def save_query(self, query_text: str, filters: Dict[str, Any]) -> str:
    query_id = self._generate_id()
    async with self.db_pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO queries (...) VALUES ($1, $2, $3, $4)",
            query_id, query_text, json.dumps(filters), "processed"
        )
    return query_id  # PASSA ✅
```

### 3. REFACTOR (Melhoria de Código)
- ✅ Adicionar docstrings completas
- ✅ Melhorar logging
- ✅ Validar limites de paginação
- ✅ Tratamento de erros (asyncpg exceptions)

## 📝 Exemplo de Teste Completo

```python
@pytest.mark.asyncio
class TestQueryRepositorySaveQuery:
    """Testes para save_query com SQL - Arrange-Act-Assert"""
    
    async def test_save_query_persists_in_database(self, repository, db_pool):
        # ARRANGE
        query_text = "doces até 50"
        filters = {"category": "Doces", "price_max": 50.0}
        
        # ACT
        query_id = await repository.save_query(query_text, filters)
        
        # ASSERT
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM queries WHERE id = $1",
                query_id
            )
        
        assert row is not None
        assert row["query_text"] == query_text
        assert row["status"] == "processed"
        assert row["filters"] == filters
```

## 🐛 Possíveis Problemas e Soluções

### Erro: "password authentication failed"

```
SOLUÇÃO: Verificar DB_HOST, DB_USER, DB_PASSWORD em .env
docker-compose exec db psql -U user -d ong_db
```

### Erro: "relation \"queries\" does not exist"

```
SOLUÇÃO: Schema não foi criado. Verificar:
- DB está rodando?
- Pool de conexões inicializou?
- main.py executou CREATE_QUERIES_TABLE?
```

### Erro: "asyncpg not found"

```
SOLUÇÃO: Instalar dependências
pip install -r requirements-test.txt
# ou
pip install asyncpg==0.29.0
```

## ✨ Benefícios da Refatoração

### Antes (Em Memória)
❌ Dados perdidos ao reiniciar  
❌ Sem persistência  
❌ Sem índices  
❌ Sem concorrência  

### Depois (PostgreSQL)
✅ Persistência garantida  
✅ Índices para performance  
✅ Prepared statements contra SQL injection  
✅ ACID transactions  
✅ Concorrência controlada  
✅ Backup/restore automático  

## 🎯 Próximos Passos

1. **Migrations automáticas** - Usar Alembic
2. **Real database tests** - Testar com dados reais
3. **Performance testing** - Benchmark queries
4. **Connection pooling tuning** - Otimizar min/max size
5. **Logging estruturado** - JSON logs com query time

## 📚 Referências

- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
- [TDD Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)
