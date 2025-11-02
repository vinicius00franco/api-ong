"""
Query Service - Lógica de negócio e orquestração
"""
import logging
from langchain_google_genai import ChatGoogleGenerativeAI

from llm_api.schemas import FiltrosBusca, QueryInput
from llm_api.repositories import IQueryRepository
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class QueryService:
    """
    Serviço de Query - Orquestra a lógica de negócio
    Responsabilidades:
    - Processar queries com LLM
    - Implementar fallback
    - Persistir resultados
    - Gerenciar o fluxo de processamento
    """

    def __init__(
        self,
        llm_model: ChatGoogleGenerativeAI,
        repository: IQueryRepository,
        structured_llm_provider: Optional[Callable[[], object]] = None,
    ):
        """
        Injeta dependências (LLM e Repository)
        Segue o princípio D de SOLID (Dependency Inversion)
        """
        self._llm = llm_model
        # Provider para permitir patch dinâmico durante testes (ex.: patch("main.structured_llm"))
        if structured_llm_provider is not None:
            self._structured_llm_provider = structured_llm_provider
        else:
            self._structured_llm_provider = lambda: llm_model.with_structured_output(FiltrosBusca)
        self._repository = repository
        logger.info("QueryService inicializado com injeção de dependências")

    async def parse_and_save_query(
        self, query_input: QueryInput
    ) -> tuple[FiltrosBusca, str]:
        """
        Processa query em linguagem natural e salva no banco
        Retorna: (FiltrosBusca, query_id)
        """
        logger.info(f"Iniciando parse de query: {query_input.query}")

        # 1. Parse via LLM
        filtros = await self._parse_query(query_input.query)
        logger.debug(f"Filtros extraídos: {filtros.model_dump()}")

        # 2. Valida filtros
        if not self.validate_filters(filtros):
            logger.warning("Filtros inválidos, aplicando fallback")
            filtros = FiltrosBusca(search_term=query_input.query)

        # 3. Salva no banco
        query_id = await self._repository.save_query(
            query_input.query, filtros.model_dump()
        )
        logger.info(f"Query salva com ID: {query_id}")

        # 4. Atualiza status
        await self._repository.update_query_status(query_id, "processed")

        return filtros, query_id

    async def parse_query_only(self, query_text: str) -> FiltrosBusca:
        """Apenas faz parse, sem salvar"""
        return await self._parse_query(query_text)

    async def get_query_history(self, limit: int = 10) -> list:
        """Recupera histórico de queries"""
        return await self._repository.get_query_history(limit)

    async def _parse_query(self, query_text: str) -> FiltrosBusca:
        """
        Lógica privada de parsing com fallback
        S de SOLID: Responsabilidade única - parsing
        """
        prompt = self._build_prompt(query_text)

        try:
            logger.debug(f"Enviando para LLM: {prompt}")
            structured_llm = self._structured_llm_provider()
            response = await structured_llm.ainvoke(prompt)
            logger.info("LLM retornou resposta com sucesso")
            return response
        except Exception as e:
            logger.warning(f"Erro no LLM, aplicando fallback: {str(e)}")
            # Fallback seguro
            return FiltrosBusca(search_term=query_text)

    @staticmethod
    def _build_prompt(query_text: str) -> str:
        """
        Constrói o prompt para o LLM
        S de SOLID: Responsabilidade única - construção do prompt
        """
        return f"""
Você é um assistente de e-commerce. Seu trabalho é extrair filtros de busca 
de uma consulta em linguagem natural do usuário.

A consulta do usuário é:
"{query_text}"

Analise a consulta e retorne um objeto JSON que corresponda ao 
schema de filtros fornecido.

- 'price_max': Se o usuário disser "até X reais" ou "menos de X".
- 'price_min': Se o usuário disser "a partir de X reais" ou "mais de X".
- 'category': Tente identificar categorias como 'Doces', 'Bebidas', 'Artesanato'.
- 'search_term': Use para palavras-chave que parecem ser nomes de produtos ou descrições.
- Se a consulta for vaga, apenas retorne o 'search_term'.
"""

    def validate_filters(self, filtros: FiltrosBusca) -> bool:
        """
        Valida filtros extraídos
        O de SOLID: Aberto para extensão, fechado para modificação
        """
        # Price_min não pode ser maior que price_max
        if (
            filtros.price_min is not None
            and filtros.price_max is not None
            and filtros.price_min > filtros.price_max
        ):
            logger.warning(
                f"Filtro inválido: price_min ({filtros.price_min}) > price_max ({filtros.price_max})"
            )
            return False

        # Price não pode ser negativo
        if (filtros.price_min is not None and filtros.price_min < 0) or (
            filtros.price_max is not None and filtros.price_max < 0
        ):
            logger.warning("Filtro inválido: preço negativo")
            return False

        return True
