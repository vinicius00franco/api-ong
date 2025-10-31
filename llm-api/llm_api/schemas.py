from pydantic import BaseModel, Field
from typing import Optional


class FiltrosBusca(BaseModel):
    """
    Schema de filtros estruturados para a busca de produtos.
    Este é o "contrato" que o backend NestJS espera receber.
    """

    search_term: Optional[str] = Field(
        None,
        description="Termos de busca genéricos ou palavras-chave, como nome do produto.",
    )

    category: Optional[str] = Field(
        None,
        description="A categoria de produto solicitada. Ex: 'Doces', 'Artesanato'",
    )

    price_min: Optional[float] = Field(
        None,
        description="O preço mínimo (maior que) extraído da query.",
    )

    price_max: Optional[float] = Field(
        None,
        description="O preço máximo (menor que) extraído da query. Ex: 'até 50 reais' = 50.0",
    )


class QueryInput(BaseModel):
    """Schema de entrada do endpoint"""

    query: str
