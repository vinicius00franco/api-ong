import pytest
from unittest.mock import AsyncMock, patch
import sys
from pathlib import Path
import os

# Add parent directory to path to import main
sys.path.insert(0, str(Path(__file__).parent.parent))

# Mock GOOGLE_API_KEY antes de importar main
os.environ["GOOGLE_API_KEY"] = "test-key"

from fastapi.testclient import TestClient
from llm_api.schemas import FiltrosBusca
from main import app


@pytest.fixture
def client():
    """Fixture para TestClient do FastAPI"""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests para o endpoint /health"""

    @pytest.mark.unit
    def test_health_endpoint(self, client):
        """Deve retornar status ok no health check"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestParseQueryEndpoint:
    """Tests para o endpoint /api/v1/parse-query"""

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_success(self, mock_structured_llm, client):
        """Deve fazer parse de query e retornar FiltrosBusca"""
        # Mock do LLM retornando FiltrosBusca bem-formado
        expected_filtros = FiltrosBusca(
            search_term="brownie",
            category="Doces",
            price_min=5.0,
            price_max=25.0,
        )
        mock_structured_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        payload = {"query": "brownie de chocolate até 25 reais"}
        response = client.post("/api/v1/parse-query", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["search_term"] == "brownie"
        assert data["category"] == "Doces"
        assert data["price_min"] == 5.0
        assert data["price_max"] == 25.0

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_only_category(self, mock_structured_llm, client):
        """Deve extrair apenas categoria da query"""
        expected_filtros = FiltrosBusca(category="Artesanato")
        mock_structured_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        response = client.post("/api/v1/parse-query", json={"query": "artesanato"})

        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Artesanato"
        assert data["search_term"] is None
        assert data["price_min"] is None

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_only_price_max(self, mock_structured_llm, client):
        """Deve extrair apenas preço máximo"""
        expected_filtros = FiltrosBusca(price_max=50.0)
        mock_structured_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        response = client.post("/api/v1/parse-query", json={"query": "até 50 reais"})

        assert response.status_code == 200
        data = response.json()
        assert data["price_max"] == 50.0
        assert data["price_min"] is None

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_with_fallback(self, mock_structured_llm, client):
        """Deve usar fallback quando LLM falha"""
        mock_structured_llm.ainvoke = AsyncMock(side_effect=Exception("LLM Error"))

        query_text = "produto misterioso"
        response = client.post("/api/v1/parse-query", json={"query": query_text})

        assert response.status_code == 200
        data = response.json()
        # Fallback retorna search_term com a query original
        assert data["search_term"] == query_text
        assert data["category"] is None
        assert data["price_min"] is None
        assert data["price_max"] is None

    @pytest.mark.unit
    def test_parse_query_invalid_payload(self, client):
        """Deve retornar 422 com payload inválido"""
        response = client.post("/api/v1/parse-query", json={"invalid": "data"})
        assert response.status_code == 422

    @pytest.mark.unit
    def test_parse_query_empty_query(self, client):
        """Deve aceitar query vazia"""
        with patch("main.structured_llm") as mock_llm:
            mock_llm.ainvoke = AsyncMock(
                return_value=FiltrosBusca()
            )
            response = client.post("/api/v1/parse-query", json={"query": ""})
            assert response.status_code == 200

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_with_special_characters(self, mock_structured_llm, client):
        """Deve processar query com caracteres especiais"""
        expected_filtros = FiltrosBusca(search_term="café")
        mock_structured_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        response = client.post(
            "/api/v1/parse-query", json={"query": "café com açúcar até R$ 50,00"}
        )

        assert response.status_code == 200

    @pytest.mark.unit
    @patch("main.structured_llm")
    def test_parse_query_response_format(self, mock_structured_llm, client):
        """Deve retornar FiltrosBusca válido conforme schema"""
        expected_filtros = FiltrosBusca(
            search_term="chocolate",
            category="Doces",
            price_min=10.0,
            price_max=50.0,
        )
        mock_structured_llm.ainvoke = AsyncMock(return_value=expected_filtros)

        response = client.post("/api/v1/parse-query", json={"query": "chocolate"})

        assert response.status_code == 200
        # Validar que a resposta segue o schema
        data = FiltrosBusca(**response.json())
        assert isinstance(data, FiltrosBusca)
