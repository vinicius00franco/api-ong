"""
Mock repository - Para testes unitários
"""
from typing import Dict, Any, Optional

from llm_api.repositories.base import IQueryRepository


class MockQueryRepository(IQueryRepository):
    """Mock do Repository para testes unitários"""

    async def save_query(self, query_text: str, filters: Dict[str, Any]) -> str:
        return "mock-id-123"

    async def get_query_history(self, limit: int = 10) -> list[Dict[str, Any]]:
        return [
            {
                "id": "mock-id-123",
                "query_text": "doces até 50",
                "filters": {"category": "Doces", "price_max": 50.0},
            }
        ]

    async def get_query_by_id(self, query_id: str) -> Optional[Dict[str, Any]]:
        if query_id == "mock-id-123":
            return {
                "id": "mock-id-123",
                "query_text": "doces até 50",
                "filters": {"category": "Doces", "price_max": 50.0},
            }
        return None

    async def update_query_status(self, query_id: str, status: str) -> bool:
        return query_id == "mock-id-123"
