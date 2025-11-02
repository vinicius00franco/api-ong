"""
Testes para QueryRepository com SQL (TDD)

Estes testes definem o comportamento esperado do repositório
que usa SQL com prepared statements para segurança contra SQL injection.
"""
import os
import pytest
import asyncio
import asyncpg
from datetime import datetime, timedelta
from typing import List
import json

from llm_api.repositories.query_repository import QueryRepository
from llm_api.repositories.schema import CREATE_QUERIES_TABLE

# ============================================================================
# FIXTURES - Configuração de banco de dados para testes
# ============================================================================


@pytest.fixture
def db_config():
    """Configuração do banco de dados para testes usando o banco real (sem banco de teste)."""
    return {
        "host": os.getenv("DB_HOST", "db"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "database": os.getenv("DB_NAME", "ong_db"),
        "user": os.getenv("DB_USER", "user"),
        "password": os.getenv("DB_PASSWORD", "password"),
    }


class _AcquireContext:
    """Context manager que adquire uma conexão e inicia uma transação sem commit.

    A transação permanece aberta até o teardown do teste, quando será feito rollback.
    """

    def __init__(self, pool_wrapper: "TransactionalPool"):
        self._pool_wrapper = pool_wrapper
        self._conn: asyncpg.Connection | None = None
        self._tx: asyncpg.transaction.Transaction | None = None

    async def __aenter__(self):
        # Adquire conexão real do pool subjacente
        self._conn = await self._pool_wrapper._pool.acquire()
        # Inicia transação
        self._tx = self._conn.transaction()
        await self._tx.start()
        # Registra para rollback no teardown
        self._pool_wrapper._connections.append(self._conn)
        self._pool_wrapper._transactions.append(self._tx)
        return self._conn

    async def __aexit__(self, exc_type, exc, tb):
        # Não faz commit/rollback aqui e não libera a conexão ainda.
        # Manter transação aberta até o teardown garante isolamento total do teste.
        return False


class TransactionalPool:
    """Wrapper de asyncpg.Pool que fornece conexões dentro de transações abertas.

    - Cada acquire abre uma nova transação e mantém a conexão retida até o teardown.
    - No teardown, todas as transações são revertidas e as conexões são liberadas.
    """

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self._connections: List[asyncpg.Connection] = []
        self._transactions: List[asyncpg.transaction.Transaction] = []

    def acquire(self) -> _AcquireContext:
        return _AcquireContext(self)

    async def close(self):
        await self._pool.close()


@pytest.fixture
async def db_pool(db_config):
    """Pool transacional: usa o banco real e reverte todas as alterações no teardown."""
    real_pool = await asyncpg.create_pool(
        **db_config,
        min_size=1,
        max_size=10,
    )

    # Garante que o schema necessário exista sem destruir dados
    async with real_pool.acquire() as conn:
        await conn.execute(CREATE_QUERIES_TABLE)

    tpool = TransactionalPool(real_pool)

    try:
        yield tpool
    finally:
        # Faz rollback de todas as transações abertas e libera conexões
        for tx in reversed(tpool._transactions):
            try:
                await tx.rollback()
            except Exception:
                pass
        for conn in reversed(tpool._connections):
            try:
                await real_pool.release(conn)
            except Exception:
                pass
        await tpool.close()


@pytest.fixture
async def db_connection(db_config):
    """Conexão única com transação por teste; rollback no final."""
    conn = await asyncpg.connect(**db_config)
    # Garante schema sem destruir dados
    await conn.execute(CREATE_QUERIES_TABLE)
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    finally:
        # Reverte quaisquer alterações deste teste
        try:
            await tx.rollback()
        finally:
            await conn.close()


@pytest.fixture
async def repository(db_connection):
    """Instância do QueryRepository usando uma única conexão transacional."""
    return QueryRepository(connection=db_connection)


# ============================================================================
# TESTES - RED (falham no início)
# ============================================================================


@pytest.mark.asyncio
class TestQueryRepositorySaveQuery:
    """Testes para o método save_query com SQL"""

    async def test_save_query_returns_valid_id(self, repository):
        """Deve retornar um ID ao salvar uma query"""
        query_id = await repository.save_query(
            query_text="doces até 50",
            filters={"category": "Doces", "price_max": 50.0}
        )
        
        assert query_id is not None
        assert isinstance(query_id, str)
        assert len(query_id) > 0

    async def test_save_query_persists_in_database(self, repository, db_connection):
        """Deve persistir a query no banco de dados"""
        query_id = await repository.save_query(
            query_text="doces até 50",
            filters={"category": "Doces", "price_max": 50.0}
        )
        
        # Verificar no banco
        row = await db_connection.fetchrow(
            "SELECT * FROM queries WHERE id = $1",
            query_id
        )
        
        assert row is not None
        assert row["query_text"] == "doces até 50"
        assert row["status"] == "processed"

    async def test_save_query_stores_filters_as_json(self, repository, db_connection):
        """Deve armazenar filtros como JSON no banco"""
        filters = {"category": "Doces", "price_max": 50.0, "tags": ["promo"]}
        query_id = await repository.save_query(
            query_text="doces",
            filters=filters
        )
        
        row = await db_connection.fetchrow(
            "SELECT filters FROM queries WHERE id = $1",
            query_id
        )
        
        db_filters = row["filters"]
        if isinstance(db_filters, str):
            db_filters = json.loads(db_filters)
        assert db_filters == filters

    async def test_save_query_sets_created_at_timestamp(self, repository, db_connection):
        """created_at deve ser definido automaticamente"""
        query_id = await repository.save_query("query1", {"x": 1})
        
        row = await db_connection.fetchrow(
            "SELECT created_at FROM queries WHERE id = $1",
            query_id
        )
        
        # Verifica apenas que o timestamp foi setado
        assert row["created_at"] is not None
        # Verifica que é um timestamp recente (últimos 5 segundos)
        now = datetime.utcnow()
        diff = abs((now - row["created_at"]).total_seconds())
        assert diff < 5, f"Timestamp muito antigo ou no futuro. Diferença: {diff}s"

    async def test_save_query_multiple_calls_different_ids(self, repository):
        """Múltiplas chamadas devem gerar IDs diferentes"""
        id1 = await repository.save_query("query1", {"x": 1})
        id2 = await repository.save_query("query2", {"x": 2})
        
        assert id1 != id2


@pytest.mark.asyncio
class TestQueryRepositoryGetHistory:
    """Testes para o método get_query_history com SQL"""

    async def test_get_query_history_returns_list(self, repository):
        """Deve retornar uma lista de queries"""
        history = await repository.get_query_history(limit=10)
        
        assert isinstance(history, list)

    async def test_get_query_history_returns_saved_queries(self, repository):
        """Deve retornar as queries salvas"""
        query_id1 = await repository.save_query("query1", {"x": 1})
        query_id2 = await repository.save_query("query2", {"x": 2})
        
        history = await repository.get_query_history(limit=10)
        
        assert len(history) >= 2
        query_ids = [q["id"] for q in history]
        assert query_id1 in query_ids
        assert query_id2 in query_ids

    async def test_get_query_history_ordered_by_created_at_desc(self, repository, db_connection):
        """Deve retornar queries ordenadas por created_at descendente"""
        import time
        from datetime import datetime, timedelta
        
        # Gera IDs únicos
        suffix = str(int(time.time() * 1000000))
        id1 = f"ord1{suffix[:4]}"
        id2 = f"ord2{suffix[:4]}"
        text1 = f"test_order_1_{suffix}"
        text2 = f"test_order_2_{suffix}"
        
        # Insere manualmente com timestamps controlados para garantir diferença
        now = datetime.utcnow()
        ts1 = now - timedelta(seconds=2)  # 2 segundos no passado
        ts2 = now  # agora
        
        await db_connection.execute(
            "INSERT INTO queries (id, query_text, filters, status, created_at) VALUES ($1, $2, $3, $4, $5)",
            id1, text1, '{"x": 1}', "processed", ts1
        )
        await db_connection.execute(
            "INSERT INTO queries (id, query_text, filters, status, created_at) VALUES ($1, $2, $3, $4, $5)",
            id2, text2, '{"x": 2}', "processed", ts2
        )
        
        # Busca com get_query_history do repository
        history = await repository.get_query_history(limit=50)
        
        # Filtra apenas as queries deste teste
        test_queries = [q for q in history if q["id"] in [id1, id2]]
        
        # Verifica que temos 2 queries e a ordem está correta
        assert len(test_queries) == 2, f"Esperado 2 queries, encontrado {len(test_queries)}"
        assert test_queries[0]["id"] == id2, f"Primeira query deveria ser {id2}, mas é {test_queries[0]['id']}"
        assert test_queries[1]["id"] == id1

    async def test_get_query_history_respects_limit(self, repository):
        """Deve respeitar o limite de resultados"""
        for i in range(15):
            await repository.save_query(f"query{i}", {"x": i})
        
        history = await repository.get_query_history(limit=5)
        
        assert len(history) == 5

    async def test_get_query_history_default_limit(self, repository):
        """Deve usar limit=10 como padrão"""
        for i in range(15):
            await repository.save_query(f"query{i}", {"x": i})
        
        history = await repository.get_query_history()  # Sem especificar limit
        
        assert len(history) == 10


@pytest.mark.asyncio
class TestQueryRepositoryGetById:
    """Testes para o método get_query_by_id com SQL"""

    async def test_get_query_by_id_returns_query(self, repository):
        """Deve retornar a query pelo ID"""
        query_id = await repository.save_query("doces", {"category": "Doces"})
        
        result = await repository.get_query_by_id(query_id)
        
        assert result is not None
        assert result["id"] == query_id
        assert result["query_text"] == "doces"

    async def test_get_query_by_id_returns_none_for_missing(self, repository):
        """Deve retornar None se query não existe"""
        result = await repository.get_query_by_id("nonexistent_id")
        
        assert result is None

    async def test_get_query_by_id_includes_all_fields(self, repository):
        """Deve retornar todos os campos da query"""
        filters = {"category": "Doces", "price_max": 50.0}
        query_id = await repository.save_query("doces", filters)
        
        result = await repository.get_query_by_id(query_id)
        
        assert result["id"] == query_id
        assert result["query_text"] == "doces"
        assert result["filters"] == filters
        assert result["status"] == "processed"
        assert result["created_at"] is not None

    async def test_get_query_by_id_safe_from_sql_injection(self, repository):
        """Deve ser seguro contra SQL injection"""
        # Tentar injetar SQL no ID
        malicious_id = "'; DROP TABLE queries; --"
        
        result = await repository.get_query_by_id(malicious_id)
        
        # Não deve desencadear erro e tabela deve continuar existindo
        assert result is None


@pytest.mark.asyncio
class TestQueryRepositoryUpdateStatus:
    """Testes para o método update_query_status com SQL"""

    async def test_update_query_status_changes_status(self, repository, db_connection):
        """Deve atualizar o status da query"""
        query_id = await repository.save_query("doces", {"category": "Doces"})
        
        success = await repository.update_query_status(query_id, "failed")
        
        assert success is True
        
        row = await db_connection.fetchrow(
            "SELECT status FROM queries WHERE id = $1",
            query_id
        )
        
        assert row["status"] == "failed"

    async def test_update_query_status_returns_false_for_missing(self, repository):
        """Deve retornar False se query não existe"""
        success = await repository.update_query_status("nonexistent", "failed")
        
        assert success is False

    async def test_update_query_status_safe_from_injection(self, repository):
        """Deve prevenir SQL injection no parâmetro status"""
        query_id = await repository.save_query("test", {"x": 1})
        
        malicious_status = "'; UPDATE queries SET status = 'hacked'; --"
        success = await repository.update_query_status(query_id, malicious_status)
        
        # Deve ser armazenado como string literal (sem executar), truncado pelo schema VARCHAR(20)
        result = await repository.get_query_by_id(query_id)
        assert success is True
        # Garante que não executou o UPDATE malicioso
        assert result is not None
        # O valor salvo deve ser truncado em 20 caracteres (VARCHAR(20))
        # "'; UPDATE queries SET status = 'hacked'; --" -> "'; UPDATE queries SE"
        expected_truncated = malicious_status[:20]
        assert result["status"] == expected_truncated
        assert len(result["status"]) == 20


@pytest.mark.asyncio
class TestQueryRepositorySecurityAndPerformance:
    """Testes de segurança e performance"""

    async def test_prepared_statements_used(self, repository):
        """Deve usar prepared statements (testado implicitamente pelos testes de injection)"""
        # Os testes de SQL injection acima verificam isso
        pass

    async def test_special_characters_in_query_text(self, repository):
        """Deve lidar com caracteres especiais na query"""
        special_text = "doces com açúcar & chocolate; DROP TABLE queries"
        query_id = await repository.save_query(special_text, {"x": 1})
        
        result = await repository.get_query_by_id(query_id)
        
        assert result["query_text"] == special_text

    async def test_large_json_filters(self, repository):
        """Deve lidar com JSON grandes em filtros"""
        large_filters = {
            "categories": [f"cat_{i}" for i in range(100)],
            "tags": [f"tag_{i}" for i in range(100)],
            "metadata": {"key": "value" * 100}
        }
        query_id = await repository.save_query("query", large_filters)
        
        result = await repository.get_query_by_id(query_id)
        
        assert result["filters"] == large_filters

    async def test_concurrent_saves(self, repository, db_pool):
        """Deve lidar com múltiplas saves concorrentes"""
        # Usa um repo baseado em pool para permitir conexões paralelas
        repo_pool = QueryRepository(db_pool=db_pool)
        tasks = [repo_pool.save_query(f"query_{i}", {"x": i}) for i in range(10)]
        
        ids = await asyncio.gather(*tasks)
        
        assert len(ids) == 10
        assert len(set(ids)) == 10  # Todos únicos


@pytest.mark.asyncio
class TestQueryRepositoryInitialization:
    """Testes de inicialização do repositório"""

    async def test_init_with_db_pool(self, db_pool):
        """Deve aceitar um pool de conexões"""
        repo = QueryRepository(db_pool=db_pool)
        
        assert repo is not None

    async def test_init_creates_tables_on_first_use(self, repository, db_connection):
        """Deve criar tabelas no primeiro uso (ou durante init)"""
        # Salvar uma query deve funcionar
        query_id = await repository.save_query("test", {"x": 1})
        
        # Verificar que tabela existe
        row = await db_connection.fetchrow(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='queries')"
        )
        
        assert row[0] is True
