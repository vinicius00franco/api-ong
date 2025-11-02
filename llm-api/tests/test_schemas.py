import pytest
from pydantic import ValidationError
from llm_api.schemas import FiltrosBusca, QueryInput


class TestFiltrosBuscaSchema:
    """Unit tests para o schema FiltrosBusca"""

    @pytest.mark.unit
    def test_filtros_busca_empty(self):
        """Deve criar FiltrosBusca vazio com todos os campos None"""
        filtro = FiltrosBusca()
        assert filtro.search_term is None
        assert filtro.category is None
        assert filtro.price_min is None
        assert filtro.price_max is None

    @pytest.mark.unit
    def test_filtros_busca_with_search_term(self):
        """Deve criar FiltrosBusca com search_term"""
        filtro = FiltrosBusca(search_term="chocolate")
        assert filtro.search_term == "chocolate"
        assert filtro.category is None

    @pytest.mark.unit
    def test_filtros_busca_with_category(self):
        """Deve criar FiltrosBusca com categoria"""
        filtro = FiltrosBusca(category="Doces")
        assert filtro.category == "Doces"
        assert filtro.search_term is None

    @pytest.mark.unit
    def test_filtros_busca_with_price_range(self):
        """Deve criar FiltrosBusca com range de preços"""
        filtro = FiltrosBusca(price_min=10.0, price_max=50.0)
        assert filtro.price_min == 10.0
        assert filtro.price_max == 50.0

    @pytest.mark.unit
    def test_filtros_busca_complete(self):
        """Deve criar FiltrosBusca com todos os campos"""
        filtro = FiltrosBusca(
            search_term="brownie",
            category="Doces",
            price_min=5.0,
            price_max=25.0,
        )
        assert filtro.search_term == "brownie"
        assert filtro.category == "Doces"
        assert filtro.price_min == 5.0
        assert filtro.price_max == 25.0

    @pytest.mark.unit
    def test_filtros_busca_price_types(self):
        """Deve aceitar int ou float para preços"""
        # Com int
        filtro1 = FiltrosBusca(price_min=10, price_max=50)
        assert filtro1.price_min == 10.0
        assert filtro1.price_max == 50.0

        # Com string que pode ser convertida
        filtro2 = FiltrosBusca(price_min="15.5", price_max="75.99")
        assert filtro2.price_min == 15.5
        assert filtro2.price_max == 75.99

    @pytest.mark.unit
    def test_filtros_busca_invalid_price(self):
        """Deve lançar ValidationError com preço inválido"""
        with pytest.raises(ValidationError):
            FiltrosBusca(price_min="invalid")


class TestQueryInputSchema:
    """Unit tests para o schema QueryInput"""

    @pytest.mark.unit
    def test_query_input_valid(self):
        """Deve criar QueryInput com query válida"""
        query = QueryInput(query="doces até 50 reais")
        assert query.query == "doces até 50 reais"

    @pytest.mark.unit
    def test_query_input_empty_string(self):
        """Deve aceitar string vazia"""
        query = QueryInput(query="")
        assert query.query == ""

    @pytest.mark.unit
    def test_query_input_special_characters(self):
        """Deve aceitar caracteres especiais"""
        query = QueryInput(query="produto com R$ 15,99 à venda!")
        assert query.query == "produto com R$ 15,99 à venda!"

    @pytest.mark.unit
    def test_query_input_missing_field(self):
        """Deve lançar ValidationError quando query ausente"""
        with pytest.raises(ValidationError):
            QueryInput()

    @pytest.mark.unit
    def test_query_input_non_string(self):
        """Deve lançar ValidationError com tipo não-string"""
        with pytest.raises(ValidationError):
            QueryInput(query=123)
