"""
Query Controller - Endpoints HTTP
Responsável apenas por HTTP concerns (request/response)
"""
import logging
from fastapi import HTTPException, status

from llm_api.schemas import FiltrosBusca, QueryInput
from llm_api.services import QueryService

logger = logging.getLogger(__name__)


class QueryController:
    """
    Controller de Queries
    Responsabilidades:
    - Receber requisições HTTP
    - Validar entrada
    - Chamar service
    - Retornar resposta HTTP
    """

    def __init__(self, service: QueryService):
        """
        Injeta o service (Dependency Injection)
        L de SOLID: Liskov Substitution - service segue interface
        """
        self._service = service
        logger.info("QueryController inicializado")

    async def parse_query(self, input: QueryInput) -> dict:
        """
        Endpoint: POST /api/v1/parse-query
        Parse query e salva no banco
        """
        try:
            logger.info(f"[HTTP] POST /parse-query - query: {input.query}")

            # Delega para service
            filtros, query_id = await self._service.parse_and_save_query(input)

            logger.info(f"[HTTP] Resposta com sucesso - query_id: {query_id}")

            # Retorna apenas os filtros (compatível com os testes atuais)
            return filtros.dict()
        except ValueError as e:
            logger.warning(f"[HTTP] Erro de validação: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )
        except Exception as e:
            logger.error(f"[HTTP] Erro interno: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao processar query",
            )

    async def parse_query_only(self, input: QueryInput) -> FiltrosBusca:
        """
        Endpoint: POST /api/v1/parse-query-only
        Parse APENAS, sem salvar no banco
        """
        try:
            logger.info(f"[HTTP] POST /parse-query-only - query: {input.query}")
            filtros = await self._service.parse_query_only(input.query)
            logger.info("[HTTP] Resposta com sucesso")
            return filtros
        except Exception as e:
            logger.error(f"[HTTP] Erro: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao processar query",
            )

    async def get_history(self, limit: int = 10) -> dict:
        """
        Endpoint: GET /api/v1/history?limit=10
        Retorna histórico de queries
        """
        try:
            logger.info(f"[HTTP] GET /history - limit: {limit}")
            history = await self._service.get_query_history(limit)
            logger.info(f"[HTTP] Retornando {len(history)} queries")
            return {"success": True, "data": history}
        except Exception as e:
            logger.error(f"[HTTP] Erro: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao recuperar histórico",
            )
