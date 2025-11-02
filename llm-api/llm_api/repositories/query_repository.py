"""
Query repository - Implementação com PostgreSQL e prepared statements para segurança
Usa asyncpg para conexões async e JSONB para armazenar filtros.

Também oferece um modo in-memory para testes unitários quando `db_pool` não é fornecido.
"""
import logging
import json
from typing import Dict, Any, Optional, List
from uuid import uuid4
from datetime import datetime

import asyncpg

from llm_api.repositories.base import IQueryRepository

logger = logging.getLogger(__name__)


class QueryRepository(IQueryRepository):
    """
    Implementação do Repository com PostgreSQL e prepared statements.
    
    Segurança:
    - Usa prepared statements (parametrized queries) contra SQL injection
    - Armazena JSON em JSONB para validação automática
    - Usa índices para performance em queries comuns
    
    Attributes:
        db_pool: asyncpg.Pool para gerenciar conexões
    """

    def __init__(self, db_pool: Optional[asyncpg.Pool] = None, connection: Optional[asyncpg.Connection] = None):
        """
        Inicializa o repositório com um pool de conexões.
        
        Args:
            db_pool: Pool de conexões do asyncpg
        """
        self.db_pool = db_pool
        self._conn = connection
        # Modo in-memory para testes unitários
        self._memory_enabled = db_pool is None and connection is None
        if self._memory_enabled:
            self._mem_store = {}
            self._mem_order = []  # manter ordem por created_at
            logger.info("QueryRepository inicializado em modo in-memory para testes")
        else:
            logger.info("QueryRepository inicializado com PostgreSQL")

    async def save_query(self, query_text: str, filters: Dict[str, Any]) -> str:
        """
        Salva uma query com seus filtros no banco.
        
        Usa INSERT com prepared statement e JSONB para armazenar filtros.
        Seguro contra SQL injection.
        
        Args:
            query_text: Texto da query original
            filters: Dicionário com filtros extraídos pela IA
            
        Returns:
            ID único (UUID v4 truncado) da query salva
            
        Raises:
            asyncpg.PostgresError: Erro ao inserir no banco
        """
        query_id = self._generate_id()
        if self._memory_enabled:
            created_at = datetime.utcnow()
            self._mem_store[query_id] = {
                "id": query_id,
                "query_text": query_text,
                "filters": filters,
                "status": "processed",
                "created_at": created_at.isoformat(),
            }
            self._mem_order.append(query_id)
            logger.info(f"[MEM] Query salva com ID: {query_id} (texto: {query_text[:50]}...)")
            return query_id
        else:
            try:
                if self._conn is not None:
                    filters_json = json.dumps(filters)
                    await self._conn.execute(
                        """
                        INSERT INTO queries (id, query_text, filters, status, created_at)
                        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                        """,
                        query_id,
                        query_text,
                        filters_json,
                        "processed",
                    )
                else:
                    async with self.db_pool.acquire() as conn:
                        filters_json = json.dumps(filters)
                        await conn.execute(
                            """
                            INSERT INTO queries (id, query_text, filters, status, created_at)
                            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                            """,
                            query_id,           # $1 - parametrizado
                            query_text,         # $2 - parametrizado
                            filters_json,       # $3 - JSON serializado para JSONB
                            "processed",        # $4 - parametrizado
                        )
                logger.info(f"Query salva com ID: {query_id} (texto: {query_text[:50]}...)")
                return query_id
            except asyncpg.PostgresError as e:
                logger.error(f"Erro ao salvar query: {e}")
                raise

    async def get_query_history(self, limit: int = 10) -> list[Dict[str, Any]]:
        """
        Retorna o histórico das últimas queries.
        
        Usa índice em created_at para performance.
        Parametriza o LIMIT contra injection.
        
        Args:
            limit: Número máximo de queries a retornar (padrão 10)
            
        Returns:
            Lista de dicionários com dados das queries, ordenados por created_at DESC
        """
        if limit < 1:
            limit = 10
        if limit > 100:
            limit = 100  # Proteção contra pedidos muito grandes

        if self._memory_enabled:
            # Ordena por created_at desc com base na ordem de inserção e timestamps
            items = [self._mem_store[qid] for qid in self._mem_order]
            items_sorted = sorted(
                items,
                key=lambda x: x.get("created_at") or "",
                reverse=True,
            )
            result = items_sorted[:limit]
            logger.info(f"[MEM] Histórico retornado: {len(result)} queries")
            return result
        else:
            try:
                if self._conn is not None:
                    rows = await self._conn.fetch(
                        """
                        SELECT 
                            id,
                            query_text,
                            filters::TEXT as filters,
                            status,
                            created_at
                        FROM queries
                        ORDER BY created_at DESC
                        LIMIT $1
                        """,
                        limit,  # $1 - parametrizado
                    )
                else:
                    async with self.db_pool.acquire() as conn:
                        rows = await conn.fetch(
                        """
                        SELECT 
                            id,
                            query_text,
                            filters::TEXT as filters,
                            status,
                            created_at
                        FROM queries
                        ORDER BY created_at DESC
                        LIMIT $1
                        """,
                        limit,  # $1 - parametrizado
                    )

                result = []
                for row in rows:
                    result.append({
                        "id": row["id"],
                        "query_text": row["query_text"],
                        "filters": json.loads(row["filters"]),
                        "status": row["status"],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    })

                logger.info(f"Histórico retornado: {len(result)} queries")
                return result
            except asyncpg.PostgresError as e:
                logger.error(f"Erro ao buscar histórico: {e}")
                raise

    async def get_query_by_id(self, query_id: str) -> Optional[Dict[str, Any]]:
        """
        Recupera uma query específica pelo ID.
        
        Usa prepared statement contra SQL injection.
        
        Args:
            query_id: ID único da query
            
        Returns:
            Dicionário com dados da query ou None se não encontrada
        """
        if self._memory_enabled:
            rec = self._mem_store.get(query_id)
            if rec:
                logger.info(f"[MEM] Query encontrada: {query_id}")
                return rec
            else:
                logger.warning(f"[MEM] Query não encontrada: {query_id}")
                return None
        else:
            try:
                if self._conn is not None:
                    row = await self._conn.fetchrow(
                        """
                        SELECT 
                            id,
                            query_text,
                            filters::TEXT as filters,
                            status,
                            created_at
                        FROM queries
                        WHERE id = $1
                        """,
                        query_id,  # $1 - parametrizado (seguro contra injection)
                    )
                else:
                    async with self.db_pool.acquire() as conn:
                        row = await conn.fetchrow(
                        """
                        SELECT 
                            id,
                            query_text,
                            filters::TEXT as filters,
                            status,
                            created_at
                        FROM queries
                        WHERE id = $1
                        """,
                        query_id,  # $1 - parametrizado (seguro contra injection)
                    )

                if row:
                    logger.info(f"Query encontrada: {query_id}")
                    return {
                        "id": row["id"],
                        "query_text": row["query_text"],
                        "filters": json.loads(row["filters"]),
                        "status": row["status"],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    }
                else:
                    logger.warning(f"Query não encontrada: {query_id}")
                    return None
            except asyncpg.PostgresError as e:
                logger.error(f"Erro ao buscar query {query_id}: {e}")
                raise

    async def update_query_status(self, query_id: str, status: str) -> bool:
        """
        Atualiza o status de uma query.
        
        Ambos os parâmetros são passados seguramente via prepared statement.
        
        Args:
            query_id: ID da query a atualizar
            status: Novo status ("processed", "failed", etc)
            
        Returns:
            True se atualizada, False se query não existe
        """
        if self._memory_enabled:
            rec = self._mem_store.get(query_id)
            if rec:
                rec["status"] = status
                logger.info(f"[MEM] Status de {query_id} atualizado para: {status}")
                return True
            else:
                logger.warning(f"[MEM] Query não encontrada ao atualizar: {query_id}")
                return False
        else:
            try:
                if self._conn is not None:
                    # Evita erro de truncamento conforme o schema (VARCHAR(20))
                    if isinstance(status, str) and len(status) > 20:
                        status = status[:20]
                    result = await self._conn.execute(
                        """
                        UPDATE queries
                        SET status = $1
                        WHERE id = $2
                        """,
                        status,     # $1 - parametrizado (protegido contra injection)
                        query_id,   # $2 - parametrizado (protegido contra injection)
                    )
                else:
                    async with self.db_pool.acquire() as conn:
                        # Evita erro de truncamento conforme o schema (VARCHAR(20))
                        if isinstance(status, str) and len(status) > 20:
                            status = status[:20]
                        result = await conn.execute(
                            """
                            UPDATE queries
                            SET status = $1
                            WHERE id = $2
                            """,
                            status,     # $1 - parametrizado (protegido contra injection)
                            query_id,   # $2 - parametrizado (protegido contra injection)
                        )

                # asyncpg retorna string como "UPDATE n" onde n é número de linhas afetadas
                if "1" in result or "UPDATE 1" in result:
                    logger.info(f"Status de {query_id} atualizado para: {status}")
                    return True
                else:
                    logger.warning(f"Query não encontrada ao atualizar: {query_id}")
                    return False
            except asyncpg.PostgresError as e:
                logger.error(f"Erro ao atualizar status de {query_id}: {e}")
                raise

    @staticmethod
    def _generate_id() -> str:
        """
        Gera um ID único para a query.
        
        Usa UUID v4 truncado para ser mais legível nos logs.
        
        Returns:
            String com 8 caracteres do UUID
        """
        return str(uuid4())[:8]
