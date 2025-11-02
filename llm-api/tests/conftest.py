"""
Configuração compartilhada para testes de integração

Define fixtures para banco de dados, conexões e isolamento de testes.
"""
import os
import pytest
import asyncio
import asyncpg
from datetime import datetime, timedelta, timezone
from typing import List

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