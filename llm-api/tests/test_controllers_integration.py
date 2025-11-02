"""
Testes de Integração para Controllers
Testa endpoints HTTP completos com banco de dados real
Segue TDD e boas práticas de testes
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi import FastAPI
from unittest.mock import AsyncMock, patch

from llm_api.schemas import FiltrosBusca, QueryInput
from llm_api.repositories import QueryRepository
from llm_api.services import QueryService
from llm_api.controllers import QueryController, create_router


@pytest.fixture
async def test_app(db_connection):
    """Aplicação FastAPI configurada para testes de integração"""
    app = FastAPI(title="Test App")

    # Repository com CONEXÃO ÚNICA (garante mesma transação)
    repository = QueryRepository(connection=db_connection)

    # Mock do LLM para controle total
    mock_llm = AsyncMock()
    mock_structured_llm = AsyncMock()

    # Service com dependências reais + mock do LLM
    service = QueryService(
        llm_model=mock_llm,
        repository=repository,
        structured_llm_provider=lambda: mock_structured_llm
    )

    # Controller
    controller = QueryController(service=service)

    # Router
    router = create_router(controller)
    app.include_router(router)

    # Health endpoint
    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app, mock_structured_llm


@pytest.fixture
async def client(test_app):
    """Cliente HTTP async para testes"""
    app, _ = test_app
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
class TestHealthEndpointIntegration:
    """Testes de integração para endpoint /health"""

    async def test_health_endpoint_returns_ok(self, client):
        """Deve retornar status ok"""
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
class TestParseQueryEndpointIntegration:
    """Testes de integração para POST /api/v1/parse-query"""

    async def test_parse_query_success_with_category_and_price(self, client, test_app):
        """Deve processar query completa e salvar no banco"""
        _, mock_llm = test_app

        # Mock do LLM retorna filtros completos
        expected_filtros = FiltrosBusca(
            search_term="brownie",
            category="Doces",
            price_min=5.0,
            price_max=25.0,
        )
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "brownie de chocolate até 25 reais"}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()

        # Verificar resposta
        assert data["search_term"] == "brownie"
        assert data["category"] == "Doces"
        assert data["price_min"] == 5.0
        assert data["price_max"] == 25.0

        # Verificar que foi salvo no banco (integração real)
        history_response = await client.get("/api/v1/history?limit=1")
        assert history_response.status_code == 200
        history_data = history_response.json()
        assert history_data["success"] is True
        assert len(history_data["data"]) >= 1

        # Verificar dados salvos
        saved_query = history_data["data"][0]
        assert saved_query["query_text"] == "brownie de chocolate até 25 reais"
        assert saved_query["status"] == "processed"

    async def test_parse_query_only_category(self, client, test_app):
        """Deve processar query apenas com categoria"""
        _, mock_llm = test_app

        expected_filtros = FiltrosBusca(category="Artesanato")
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "artesanato handmade"}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "Artesanato"
        assert data["search_term"] is None
        assert data["price_min"] is None
        assert data["price_max"] is None

    async def test_parse_query_only_price_max(self, client, test_app):
        """Deve processar query apenas com preço máximo"""
        _, mock_llm = test_app

        expected_filtros = FiltrosBusca(price_max=50.0)
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "até 50 reais"}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()

        assert data["price_max"] == 50.0
        assert data["price_min"] is None
        assert data["category"] is None
        assert data["search_term"] is None

    async def test_parse_query_with_fallback_on_llm_error(self, client, test_app):
        """Deve usar fallback quando LLM falha"""
        _, mock_llm = test_app

        # Mock do LLM falha
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("LLM Error"))

        query_text = "produto misterioso xyz"
        payload = {"query": query_text}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()

        # Fallback: apenas search_term com query original
        assert data["search_term"] == query_text
        assert data["category"] is None
        assert data["price_min"] is None
        assert data["price_max"] is None

    async def test_parse_query_invalid_payload_missing_query(self, client):
        """Deve retornar 422 com payload inválido (query obrigatória)"""
        payload = {"invalid": "data"}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 422
        error_data = response.json()
        assert "detail" in error_data

    async def test_parse_query_empty_query(self, client, test_app):
        """Deve aceitar query vazia"""
        _, mock_llm = test_app

        expected_filtros = FiltrosBusca()
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": ""}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["search_term"] is None
        assert data["category"] is None

    async def test_parse_query_with_special_characters(self, client, test_app):
        """Deve processar query com caracteres especiais"""
        _, mock_llm = test_app

        expected_filtros = FiltrosBusca(search_term="café")
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "café com açúcar até R$ 50,00"}
        response = await client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["search_term"] == "café"


@pytest.mark.asyncio
class TestParseQueryOnlyEndpointIntegration:
    """Testes de integração para POST /api/v1/parse-query-only"""

    async def test_parse_query_only_success(self, client, test_app):
        """Deve processar query sem salvar no banco"""
        _, mock_llm = test_app

        expected_filtros = FiltrosBusca(
            search_term="pizza",
            category="Alimentos",
            price_max=30.0,
        )
        mock_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "pizza até 30 reais"}
        response = await client.post("/api/v1/parse-query-only", json=payload)

        assert response.status_code == 200
        data = response.json()

        assert data["search_term"] == "pizza"
        assert data["category"] == "Alimentos"
        assert data["price_max"] == 30.0

        # Verificar que NÃO foi salvo no banco
        history_response = await client.get("/api/v1/history?limit=10")
        assert history_response.status_code == 200
        history_data = history_response.json()

        # Não deve haver queries salvas com este texto
        saved_queries = [q for q in history_data["data"] if q["query_text"] == "pizza até 30 reais"]
        assert len(saved_queries) == 0

    async def test_parse_query_only_with_fallback(self, client, test_app):
        """Deve usar fallback quando LLM falha"""
        _, mock_llm = test_app

        mock_llm.ainvoke = AsyncMock(side_effect=Exception("LLM Error"))

        query_text = "produto sem parse"
        payload = {"query": query_text}
        response = await client.post("/api/v1/parse-query-only", json=payload)

        assert response.status_code == 200
        data = response.json()

        # Fallback retorna apenas search_term
        assert data["search_term"] == query_text
        assert data["category"] is None


@pytest.mark.asyncio
class TestHistoryEndpointIntegration:
    """Testes de integração para GET /api/v1/history"""

    async def test_get_history_empty(self, client):
        """Deve retornar lista vazia quando não há histórico"""
        response = await client.get("/api/v1/history")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["data"] == []

    async def test_get_history_with_saved_queries(self, client, test_app):
        """Deve retornar histórico com queries salvas"""
        _, mock_llm = test_app

        # Salvar algumas queries via endpoint
        queries_data = [
            ("doces até 50", FiltrosBusca(category="Doces", price_max=50.0)),
            ("bebidas geladas", FiltrosBusca(category="Bebidas")),
            ("artesanato", FiltrosBusca(search_term="artesanato")),
        ]

        for query_text, filtros in queries_data:
            mock_llm.ainvoke = AsyncMock(return_value=filtros)
            payload = {"query": query_text}
            save_response = await client.post("/api/v1/parse-query", json=payload)
            assert save_response.status_code == 200

        # Buscar histórico
        response = await client.get("/api/v1/history?limit=10")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]) >= 3

        # Verificar que todas as queries estão presentes (ordem pode variar devido a timestamps iguais)
        query_texts = [q["query_text"] for q in data["data"]]
        assert "doces até 50" in query_texts
        assert "bebidas geladas" in query_texts
        assert "artesanato" in query_texts

    async def test_get_history_respects_limit(self, client, test_app):
        """Deve respeitar o parâmetro limit"""
        _, mock_llm = test_app

        # Salvar 5 queries
        for i in range(5):
            filtros = FiltrosBusca(search_term=f"query-{i}")
            mock_llm.ainvoke = AsyncMock(return_value=filtros)
            payload = {"query": f"query {i}"}
            save_response = await client.post("/api/v1/parse-query", json=payload)
            assert save_response.status_code == 200

        # Buscar com limit=3
        response = await client.get("/api/v1/history?limit=3")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]) == 3

    async def test_get_history_default_limit(self, client, test_app):
        """Deve usar limit=10 como padrão"""
        _, mock_llm = test_app

        # Salvar 15 queries
        for i in range(15):
            filtros = FiltrosBusca(search_term=f"query-{i}")
            mock_llm.ainvoke = AsyncMock(return_value=filtros)
            payload = {"query": f"query {i}"}
            save_response = await client.post("/api/v1/parse-query", json=payload)
            assert save_response.status_code == 200

        # Buscar sem especificar limit
        response = await client.get("/api/v1/history")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]) == 10  # Deve respeitar limite padrão


@pytest.mark.asyncio
class TestErrorHandlingIntegration:
    """Testes de integração para tratamento de erros"""

    async def test_parse_query_with_llm_error_uses_fallback(self, client, test_app):
        """Deve usar fallback quando LLM falha (comportamento esperado)"""
        _, mock_llm = test_app

        # Mock do LLM lança erro inesperado
        mock_llm.ainvoke = AsyncMock(side_effect=RuntimeError("Erro interno"))

        query_text = "test produto"
        payload = {"query": query_text}
        response = await client.post("/api/v1/parse-query", json=payload)

        # Sistema usa fallback com sucesso
        assert response.status_code == 200
        data = response.json()
        assert data["search_term"] == query_text
        assert data["category"] is None

    async def test_parse_query_only_with_llm_error_uses_fallback(self, client, test_app):
        """Deve usar fallback quando LLM falha no parse-only (comportamento esperado)"""
        _, mock_llm = test_app

        mock_llm.ainvoke = AsyncMock(side_effect=RuntimeError("Erro interno"))

        query_text = "test produto"
        payload = {"query": query_text}
        response = await client.post("/api/v1/parse-query-only", json=payload)

        # Sistema usa fallback com sucesso
        assert response.status_code == 200
        data = response.json()
        assert data["search_term"] == query_text
        assert data["category"] is None


@pytest.mark.asyncio
class TestDataPersistenceIntegration:
    """Testes de integração para persistência de dados"""

    async def test_query_persistence_across_requests(self, client, test_app):
        """Queries devem persistir entre diferentes requests"""
        _, mock_llm = test_app

        # Salvar query
        filtros = FiltrosBusca(category="Doces", price_max=25.0)
        mock_llm.ainvoke = AsyncMock(return_value=filtros)

        payload = {"query": "doces até 25"}
        save_response = await client.post("/api/v1/parse-query", json=payload)
        assert save_response.status_code == 200

        # Buscar histórico em request separado
        history_response = await client.get("/api/v1/history")
        assert history_response.status_code == 200

        history_data = history_response.json()
        assert len(history_data["data"]) >= 1

        # Verificar dados persistidos
        saved_query = history_data["data"][0]
        assert saved_query["query_text"] == "doces até 25"
        assert saved_query["status"] == "processed"
        assert "id" in saved_query
        assert "created_at" in saved_query

    async def test_multiple_queries_isolation(self, client, test_app):
        """Múltiplas queries devem ser isoladas"""
        _, mock_llm = test_app

        # Salvar duas queries diferentes
        queries = [
            ("doces", FiltrosBusca(category="Doces")),
            ("bebidas", FiltrosBusca(category="Bebidas")),
        ]

        for query_text, filtros in queries:
            mock_llm.ainvoke = AsyncMock(return_value=filtros)
            payload = {"query": query_text}
            response = await client.post("/api/v1/parse-query", json=payload)
            assert response.status_code == 200

        # Verificar que ambas estão no histórico
        history_response = await client.get("/api/v1/history?limit=10")
        assert history_response.status_code == 200

        history_data = history_response.json()
        saved_texts = [q["query_text"] for q in history_data["data"]]

        assert "doces" in saved_texts
        assert "bebidas" in saved_texts