"""
Testes unitários para Repository e Service
Segue TDD e SOLID
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from llm_api.repositories import QueryRepository, MockQueryRepository, IQueryRepository
from llm_api.services import QueryService
from llm_api.schemas import FiltrosBusca, QueryInput


class TestQueryRepository:
    """Testes do Repository"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_save_query(self):
        """Deve salvar query e retornar ID"""
        repo = QueryRepository()
        filters_dict = {"category": "Doces", "price_max": 50.0}

        query_id = await repo.save_query("doces até 50", filters_dict)

        assert query_id is not None
        assert len(query_id) > 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_query_by_id(self):
        """Deve recuperar query salva"""
        repo = QueryRepository()
        filters_dict = {"category": "Doces", "price_max": 50.0}

        # Save
        query_id = await repo.save_query("doces até 50", filters_dict)

        # Get
        record = await repo.get_query_by_id(query_id)

        assert record is not None
        assert record["query_text"] == "doces até 50"
        assert record["filters"] == filters_dict

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_query_by_id_not_found(self):
        """Deve retornar None para query inexistente"""
        repo = QueryRepository()
        record = await repo.get_query_by_id("inexistente-123")
        assert record is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_update_query_status(self):
        """Deve atualizar status da query"""
        repo = QueryRepository()
        filters_dict = {"category": "Doces"}

        query_id = await repo.save_query("doces", filters_dict)
        success = await repo.update_query_status(query_id, "failed")

        assert success is True
        record = await repo.get_query_by_id(query_id)
        assert record["status"] == "failed"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_update_query_status_not_found(self):
        """Deve retornar False para query inexistente"""
        repo = QueryRepository()
        success = await repo.update_query_status("inexistente-123", "processed")
        assert success is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_query_history(self):
        """Deve retornar histórico ordenado por data"""
        repo = QueryRepository()

        # Salva várias queries
        await repo.save_query("doces", {"category": "Doces"})
        await repo.save_query("bebidas", {"category": "Bebidas"})
        await repo.save_query("artesanato", {"category": "Artesanato"})

        history = await repo.get_query_history(limit=10)

        assert len(history) >= 3
        # Última salva deve ser a primeira (ordenação DESC)
        assert history[0]["query_text"] == "artesanato"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_query_history_limit(self):
        """Deve respeitar o limit"""
        repo = QueryRepository()

        for i in range(5):
            await repo.save_query(f"query-{i}", {})

        history = await repo.get_query_history(limit=2)
        assert len(history) == 2


class TestMockQueryRepository:
    """Testes do Mock Repository"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_mock_save_query(self):
        """Mock deve retornar ID fixo"""
        repo = MockQueryRepository()
        query_id = await repo.save_query("doces", {})
        assert query_id == "mock-id-123"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_mock_get_query_by_id_found(self):
        """Mock deve retornar dados quando ID existe"""
        repo = MockQueryRepository()
        record = await repo.get_query_by_id("mock-id-123")
        assert record is not None
        assert record["query_text"] == "doces até 50"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_mock_get_query_by_id_not_found(self):
        """Mock deve retornar None quando ID não existe"""
        repo = MockQueryRepository()
        record = await repo.get_query_by_id("inexistente")
        assert record is None


class TestQueryService:
    """Testes do Service"""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_parse_query_only_success(self):
        """Deve fazer parse de query com sucesso"""
        # Mock do LLM
        mock_llm = AsyncMock()
        mock_llm.with_structured_output = MagicMock(
            return_value=AsyncMock(
                ainvoke=AsyncMock(
                    return_value=FiltrosBusca(
                        category="Doces", price_max=50.0
                    )
                )
            )
        )

        # Mock do Repository
        mock_repo = AsyncMock(spec=IQueryRepository)

        # Service com mocks
        service = QueryService(llm_model=mock_llm, repository=mock_repo)

        # Act
        result = await service.parse_query_only("doces até 50")

        # Assert
        assert result.category == "Doces"
        assert result.price_max == 50.0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_parse_query_only_fallback(self):
        """Deve usar fallback quando LLM falha"""
        # Mock do LLM que falha
        mock_llm = AsyncMock()
        mock_llm.with_structured_output = MagicMock(
            return_value=AsyncMock(
                ainvoke=AsyncMock(side_effect=Exception("LLM Error"))
            )
        )

        # Mock do Repository
        mock_repo = AsyncMock(spec=IQueryRepository)

        # Service
        service = QueryService(llm_model=mock_llm, repository=mock_repo)

        # Act
        result = await service.parse_query_only("doces até 50")

        # Assert - Fallback retorna search_term
        assert result.search_term == "doces até 50"
        assert result.category is None
        assert result.price_min is None
        assert result.price_max is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_parse_and_save_query(self):
        """Deve fazer parse e salvar no banco"""
        # Mock do LLM
        mock_llm = AsyncMock()
        mock_llm.with_structured_output = MagicMock(
            return_value=AsyncMock(
                ainvoke=AsyncMock(
                    return_value=FiltrosBusca(
                        category="Doces", price_max=50.0
                    )
                )
            )
        )

        # Mock do Repository
        mock_repo = AsyncMock(spec=IQueryRepository)
        mock_repo.save_query = AsyncMock(return_value="query-id-123")
        mock_repo.update_query_status = AsyncMock(return_value=True)

        # Service
        service = QueryService(llm_model=mock_llm, repository=mock_repo)

        # Act
        query_input = QueryInput(query="doces até 50")
        filtros, query_id = await service.parse_and_save_query(query_input)

        # Assert
        assert query_id == "query-id-123"
        assert filtros.category == "Doces"
        assert mock_repo.save_query.called
        assert mock_repo.update_query_status.called

    @pytest.mark.unit
    def test_validate_filters_valid(self):
        """Deve validar filtros válidos"""
        service = QueryService(
            llm_model=AsyncMock(), repository=AsyncMock()
        )

        filtros = FiltrosBusca(
            category="Doces", price_min=10.0, price_max=50.0
        )
        assert service.validate_filters(filtros) is True

    @pytest.mark.unit
    def test_validate_filters_invalid_price_range(self):
        """Deve rejeitar price_min > price_max"""
        service = QueryService(
            llm_model=AsyncMock(), repository=AsyncMock()
        )

        filtros = FiltrosBusca(price_min=100.0, price_max=50.0)
        assert service.validate_filters(filtros) is False

    @pytest.mark.unit
    def test_validate_filters_negative_price(self):
        """Deve rejeitar preço negativo"""
        service = QueryService(
            llm_model=AsyncMock(), repository=AsyncMock()
        )

        filtros = FiltrosBusca(price_max=-10.0)
        assert service.validate_filters(filtros) is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_query_history(self):
        """Deve recuperar histórico do repository"""
        mock_repo = AsyncMock(spec=IQueryRepository)
        mock_repo.get_query_history = AsyncMock(
            return_value=[
                {"id": "1", "query_text": "doces"},
                {"id": "2", "query_text": "bebidas"},
            ]
        )

        service = QueryService(llm_model=AsyncMock(), repository=mock_repo)

        history = await service.get_query_history(limit=10)

        assert len(history) == 2
        assert history[0]["query_text"] == "doces"
        mock_repo.get_query_history.assert_called_once_with(10)
