"""
Application factory e setup
Arquitetura em camadas com Dependency Injection
Inicializa pool de conexões PostgreSQL para QueryRepository
"""
import os
import logging
import asyncpg
from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Camadas
from llm_api.repositories import QueryRepository
from llm_api.repositories.schema import CREATE_QUERIES_TABLE
from llm_api.services import QueryService
from llm_api.controllers import QueryController, create_router
from llm_api.schemas import FiltrosBusca

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise EnvironmentError("Variável de ambiente GOOGLE_API_KEY não definida.")

# Variáveis globais
db_pool = None
# Exposto para testes (permite patch("main.structured_llm"))
structured_llm = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação:
    - Cria pool de conexões ao iniciar
    - Cria schema do banco se necessário
    - Fecha pool ao desligar
    """
    global db_pool
    
    # STARTUP
    logger.info("📦 Inicializando pool de conexões PostgreSQL...")
    db_config = {
        "host": os.getenv("DB_HOST", "db"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "database": os.getenv("DB_NAME", "ong_db"),
        "user": os.getenv("DB_USER", "user"),
        "password": os.getenv("DB_PASSWORD", "password"),
    }
    
    try:
        db_pool = await asyncpg.create_pool(
            **db_config,
            min_size=2,
            max_size=10,
            command_timeout=60,
        )
        logger.info("✓ Pool de conexões criado com sucesso")

        # Criar schema do banco (tabelas)
        async with db_pool.acquire() as conn:
            await conn.execute(CREATE_QUERIES_TABLE)
            logger.info("✓ Schema do banco verificado/criado")

    except Exception as e:
        # Em ambiente de testes/unit, permitir prosseguir em modo in-memory
        logger.warning(f"⚠️ Não foi possível conectar ao banco, prosseguindo em modo in-memory: {e}")
        db_pool = None
    
    yield  # Aplicação roda aqui
    
    # SHUTDOWN
    if db_pool:
        await db_pool.close()
        logger.info("🛑 Pool de conexões fechado")


def create_app() -> FastAPI:
    """
    Application Factory Pattern
    Cria a aplicação com todas as dependências injetadas
    """
    app = FastAPI(
        title="LLM API de Filtros",
        version="0.4.0-sql",
        lifespan=lifespan,
    )

    # ========== SETUP DEPENDÊNCIAS ==========

    # 1. LLM Model (Dependency)
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest")
    logger.info("✓ LLM Model inicializado")
    global structured_llm
    structured_llm = llm.with_structured_output(FiltrosBusca)

    # 2. Repository (Dependency) - Será recriado com pool na startup
    # Usar um placeholder que será substituído
    def get_repository():
        """Factory para obter repository com pool atual (ou in-memory em testes)"""
        return QueryRepository(db_pool=db_pool)
    
    # 3. Service (Dependency)
    def get_service():
        repository = get_repository()
        # Provider aponta para variável de módulo para permitir patch dinâmico nos testes
        return QueryService(
            llm_model=llm,
            repository=repository,
            structured_llm_provider=lambda: structured_llm,
        )
    
    # 4. Controller (Dependency)
    def get_controller():
        service = get_service()
        return QueryController(service=service)

    # ========== REGISTRAR ROTAS (imediato para suportar testes sem DB) ==========
    controller = get_controller()
    router = create_router(controller)
    app.include_router(router)
    logger.info("✓ Rotas registradas (in-memory quando DB indisponível)")

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("🛑 Aplicação finalizada")

    return app


# Instância global da aplicação
app = create_app()

# Health root (compatível com testes que usam /health sem prefixo)
@app.get("/health")
async def root_health():
    return {"status": "ok"}
