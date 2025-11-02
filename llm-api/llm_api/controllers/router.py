"""
Router - Factory para criar as rotas
"""
import logging
from fastapi import APIRouter, HTTPException, status

from llm_api.schemas import QueryInput, FiltrosBusca
from llm_api.controllers.query_controller import QueryController

logger = logging.getLogger(__name__)


def create_router(controller: QueryController) -> APIRouter:
    """
    Factory function para criar o router com endpoints
    Segue o padrão de composição sobre herança
    """
    router = APIRouter(prefix="/api/v1", tags=["queries"])

    @router.get("/health", tags=["health"])
    async def health():
        """Health check endpoint"""
        logger.debug("[HTTP] GET /health")
        return {"status": "ok"}

    @router.post("/parse-query", response_model=dict)
    async def parse_query(input: QueryInput):
        """
        Parse query e salva no banco
        
        ```
        POST /api/v1/parse-query
        {
            "query": "doces até 50 reais"
        }
        ```
        """
        return await controller.parse_query(input)

    @router.post("/parse-query-only", response_model=FiltrosBusca)
    async def parse_query_only(input: QueryInput):
        """
        Parse APENAS, sem salvar
        
        ```
        POST /api/v1/parse-query-only
        {
            "query": "doces até 50 reais"
        }
        ```
        """
        return await controller.parse_query_only(input)

    @router.get("/history", response_model=dict)
    async def get_history(limit: int = 10):
        """
        Retorna histórico de queries
        
        ```
        GET /api/v1/history?limit=10
        ```
        """
        return await controller.get_history(limit)

    return router
