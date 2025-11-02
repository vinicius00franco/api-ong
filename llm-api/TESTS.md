# LLM API - Testes e Documentação

## 📋 Visão Geral

A LLM API é um serviço FastAPI que converte buscas em linguagem natural em filtros estruturados usando o modelo Gemini da Google.

## 🧪 Testes

### Estrutura de Testes

```
tests/
├── test_schemas.py      # Testes unitários dos schemas Pydantic
└── test_endpoints.py    # Testes dos endpoints da API
```

### Cobertura de Testes

- **21 testes** com **100% de cobertura** dos módulos críticos
- Testes unitários para validação de schemas
- Testes de endpoints com mocks do LLM
- Testes de fallback (quando o LLM falha)

### Rodando os Testes

#### Opção 1: Via Shell Script (Recomendado)

```bash
# Do root do projeto
bash run-llm-tests.sh
```

#### Opção 2: Via Docker Compose

```bash
# Rodar somente os testes da LLM API
docker-compose --profile test up llm-api-tests

# Para limpar após rodar
docker-compose --profile test down
```

#### Opção 3: Localmente com pip

```bash
cd llm-api

# Instalar dependências de teste
pip install -r requirements-test.txt --break-system-packages

# Rodar os testes
pytest tests/ -v --cov=llm_api --cov-report=html

# Ver relatório de cobertura
# Abrir: htmlcov/index.html
```

## 📊 Relatório de Cobertura

Após rodar os testes, um relatório HTML é gerado em:
- `./llm-api/coverage/index.html` (via Docker)
- `./llm-api/htmlcov/index.html` (via local)

## 🔧 Configuração

### Arquivo `.env` Requerido

```dotenv
GOOGLE_API_KEY=seu_gemini_api_key_aqui
```

## 📝 Testes Incluídos

### Test Schemas (`test_schemas.py`)

**FiltrosBuscaSchema:**
- ✅ Criação vazia (todos os campos None)
- ✅ Com search_term
- ✅ Com category
- ✅ Com range de preços
- ✅ Com todos os campos
- ✅ Conversão automática de tipos (int → float, string → float)
- ✅ Validação de preços inválidos

**QueryInputSchema:**
- ✅ Query válida
- ✅ String vazia
- ✅ Caracteres especiais (acentos, pontuação)
- ✅ Erro ao campo ausente
- ✅ Erro com tipo não-string

### Test Endpoints (`test_endpoints.py`)

**Health Endpoint:**
- ✅ GET `/health` retorna status ok

**Parse Query Endpoint:**
- ✅ Parse bem-sucedido com LLM
- ✅ Extração apenas de categoria
- ✅ Extração apenas de preço máximo
- ✅ Fallback quando LLM falha
- ✅ Erro 422 com payload inválido
- ✅ Aceitação de query vazia
- ✅ Processamento de caracteres especiais
- ✅ Validação de formato de resposta

## 🏗️ Arquitetura

### Arquivos Principais

- `main.py` - Aplicação FastAPI
- `llm_api/schemas.py` - Schemas Pydantic
- `requirements.txt` - Dependências de produção
- `requirements-test.txt` - Dependências de teste
- `Dockerfile` - Imagem de produção
- `Dockerfile.test` - Imagem para rodar testes

### Dependências

**Produção:**
- FastAPI 0.110.0
- Uvicorn 0.29.0
- Pydantic >=2.7.4
- LangChain 0.3.0
- LangChain Google Generative AI 2.0.0

**Teste:**
- pytest 7.4.4
- pytest-asyncio 0.23.3
- httpx 0.26.0
- pytest-cov 4.1.0

## 🚀 Deployment

### Container de Produção

```bash
docker build -f ./llm-api/Dockerfile -t llm-api .
docker run -p 8000:8000 --env-file llm-api/.env llm-api
```

### Container de Testes

```bash
docker build -f ./llm-api/Dockerfile.test -t llm-api-tests ./llm-api
docker run --env-file llm-api/.env -v $(pwd)/llm-api/coverage:/app/coverage llm-api-tests
```

## 📚 Endpoints

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### POST `/api/v1/parse-query`

Converte busca em linguagem natural para filtros estruturados.

**Request:**
```json
{
  "query": "doces até 50 reais"
}
```

**Response (Sucesso):**
```json
{
  "search_term": null,
  "category": "Doces",
  "price_min": null,
  "price_max": 50.0
}
```

**Response (Fallback - quando LLM falha):**
```json
{
  "search_term": "doces até 50 reais",
  "category": null,
  "price_min": null,
  "price_max": null
}
```

## 🐛 Troubleshooting

### Conflito de Dependências

Se houver erro durante build do Docker sobre dependências conflitantes:

1. Verifique que `requirements.txt` e `requirements-test.txt` usam as mesmas versões
2. A versão do Pydantic deve ser >=2.7.4
3. A versão do Langchain deve ser 0.3.0 (compatível com langchain-google-genai 2.0.0)

### Testes Falhando

1. Verifique se `GOOGLE_API_KEY` está setado (necessário para o import do LLM)
2. Os testes fazem mock do LLM, então não precisa de chave válida
3. Se o import de `fastapi.testclient` falhar, reinstale as dependências: `pip install -r requirements-test.txt --break-system-packages`

## 📖 Referências

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pytest Documentation](https://docs.pytest.org/)
- [LangChain Google Generative AI](https://python.langchain.com/docs/integrations/llms/google_generative_ai)
- [Pydantic Documentation](https://docs.pydantic.dev/)
