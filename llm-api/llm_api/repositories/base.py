"""
Base repository - Define a interface
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class IQueryRepository(ABC):
    """Interface do Repository - Define o contrato"""

    @abstractmethod
    async def save_query(self, query_text: str, filters: Dict[str, Any]) -> str:
        """Salva uma query processada no banco de dados"""
        pass

    @abstractmethod
    async def get_query_history(self, limit: int = 10) -> list[Dict[str, Any]]:
        """Recupera histórico de queries"""
        pass

    @abstractmethod
    async def get_query_by_id(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Recupera uma query específica pelo ID"""
        pass

    @abstractmethod
    async def update_query_status(self, query_id: str, status: str) -> bool:
        """Atualiza o status de uma query"""
        pass

    @abstractmethod
    async def find_cached_query(self, query_text: str) -> Optional[Dict[str, Any]]:
        """Busca query similar no cache (últimas 24h)"""
        pass
