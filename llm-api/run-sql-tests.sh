#!/usr/bin/env bash
# run-sql-tests.sh
# Script para rodar os testes SQL no Docker ou localmente

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 SQL Repository Tests${NC}"
echo "================================"

# ============================================================
# OPÇÃO 1: Docker (Recomendado)
# ============================================================

if command -v docker-compose &> /dev/null; then
    echo -e "\n${GREEN}✓${NC} Docker Compose detectado"
    
    # Verificar se DB está rodando
    if docker-compose ps db | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} PostgreSQL rodando"
    else
        echo -e "${YELLOW}⚠${NC} Iniciando serviços..."
        docker-compose up -d db
        sleep 10
        echo -e "${GREEN}✓${NC} PostgreSQL iniciado"
    fi
    
    echo -e "\n${BLUE}📦 Executando testes no container${NC}\n"
    docker-compose run --rm \
        -e PYTHONUNBUFFERED=1 \
        llm-api-tests \
        pytest tests/test_query_repository_sql.py -v \
        --tb=short \
        --cov=llm_api.repositories \
        --cov-report=term-missing \
        --cov-report=html
    
    TEST_EXIT_CODE=$?
    
# ============================================================
# OPÇÃO 2: Local (com PostgreSQL rodando)
# ============================================================
elif command -v pytest &> /dev/null; then
    echo -e "\n${YELLOW}⚠${NC} Docker não detectado"
    echo -e "Tentando rodar localmente...\n"
    
    # Verificar dependências
    if ! python -c "import asyncpg" 2>/dev/null; then
        echo -e "${RED}❌${NC} asyncpg não instalado"
        echo "Instale com: pip install -r requirements-test.txt"
        exit 1
    fi
    
    echo -e "${BLUE}🧪 Rodando testes localmente${NC}\n"
    pytest tests/test_query_repository_sql.py -v \
        --tb=short \
        --cov=llm_api.repositories \
        --cov-report=term-missing \
        --cov-report=html
    
    TEST_EXIT_CODE=$?
    
else
    echo -e "${RED}❌${NC} Nem Docker nem Pytest encontrados"
    echo "Instale:"
    echo "  - Docker: https://docs.docker.com/get-docker/"
    echo "  - ou pytest: pip install -r requirements-test.txt"
    exit 1
fi

# ============================================================
# Resultado Final
# ============================================================

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Todos os testes passaram!${NC}"
    echo -e "\n${BLUE}📊 Relatório de cobertura:${NC}"
    echo "  HTML: coverage/htmlcov/index.html (se disponível)"
    echo "  Terminal: Veja acima"
else
    echo -e "\n${RED}❌ Alguns testes falharam${NC}"
    echo "Ver output acima para detalhes"
fi

exit $TEST_EXIT_CODE
