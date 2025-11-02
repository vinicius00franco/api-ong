"""
Repository layer - Contrato de acesso a dados
Implementa o padrão Repository e Dependency Injection
"""
from llm_api.repositories.base import IQueryRepository
from llm_api.repositories.query_repository import QueryRepository
from llm_api.repositories.mock_repository import MockQueryRepository

__all__ = [
    "IQueryRepository",
    "QueryRepository",
    "MockQueryRepository",
]
