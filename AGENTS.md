# AGENTS.md - Diretrizes de Desenvolvimento

## 🎯 TDD Obrigatório
- **Red-Green-Refactor**: Teste falha → Código mínimo → Refatorar
- **Cobertura 80%**: Crítico para auth/business logic
- **Arrange-Act-Assert**: Estrutura padrão de teste

## 🏗️ SOLID Aplicado
- **S**: Uma responsabilidade por classe/função
- **O**: Extensível via interfaces, não modificação
- **L**: Subtipos intercambiáveis
- **I**: Interfaces específicas (IProductRepository vs IGenericRepository)
- **D**: Injete abstrações, não implementações

## 📁 Arquitetura Limpa
```
src/
├── __tests__/     # Por feature, não por tipo
├── types/         # Contratos de dados
├── repositories/  # I*Repository interfaces
├── services/      # Regras de negócio
├── middleware/    # Cross-cutting concerns
└── lib/          # Utilitários puros
```

### Backend NestJS: estrutura por feature (obrigatório)
- Em `backend/src`, organize por feature (ex.: `auth/`, `products/`, `orders/`).
- Dentro de cada feature, separe por camadas em ARQUIVOS (não crie subpastas `controllers/`, `services/`, `repositories/`).
- Nomeação padronizada por arquivo:
	- `authController.ts`, `authService.ts`, `authRepository.ts`, `authSchemas.ts` (Zod), `authTypes.ts`
	- Interfaces com prefixo `I` no mesmo arquivo quando fizer sentido (ex.: `IAuthRepository`).
- Evite barrels desnecessários; `index.ts` por feature é opcional e só para reexport controlado.
- Testes da feature ficam em `src/__tests__/<feature>/...` seguindo TDD.

Exemplo:
```
backend/
	src/
		auth/
			authController.ts
			authService.ts
			authRepository.ts
			authSchemas.ts
			authTypes.ts
		products/
			productController.ts
			productService.ts
			productRepository.ts
			productSchemas.ts
		middleware/
			authMiddleware.ts
		lib/
		types/
```

Regras importantes para NestJS:
- Controllers expõem rotas HTTP, Services concentram regras de negócio, Repositories isolam acesso a dados.
- Injete abstrações (ex.: `IProductRepository`) via providers do Nest; implementações concretas ficam próximas da feature.
- Multi-tenancy: todos os repositories devem receber `organizationId` (do middleware/auth) e filtrar queries por organização.
- Validação: use Zod nos `*Schemas.ts` da própria feature antes de chamar o service.

## 🔒 Multi-tenancy Crítico
- **organizationId**: Sempre no JWT e queries
- **Middleware auth**: Extrai e injeta organizationId
- **Repository pattern**: Filtragem automática por organização

```typescript
// ❌ Nunca
SELECT * FROM products WHERE id = $1

// ✅ Sempre
SELECT * FROM products WHERE id = $1 AND organization_id = $2
```

## 🧪 Estratégia de Testes
- **Unit**: Services com mocks de repositories
- **Integration**: APIs com DB real
- **Factories**: Dados de teste reutilizáveis
- **Cleanup**: Estado limpo entre testes
- **Dados seguros**: Testes não devem ter configurações padrão ou atribuições com dados sensíveis. Use null, string vazia ou valores adequados ao contexto

## 📊 Logs Estruturados JSON
```typescript
// Request logs obrigatórios
{ timestamp, route, method, status, latency, userId, organizationId }

// Search logs específicos
{ timestamp, searchQuery, generatedFilters, aiSuccess, fallbackApplied }
```

## 🌿 Gestão de Branches
- **Toda alteração**: Nova branch da branch atual
- **Nomenclatura descritiva**: `feature/auth-jwt`, `fix/product-validation`, `refactor/clean-architecture`
- **Contexto claro**: Nome deve explicar o que foi alterado
- **Separação**: Cada mudança em sua própria branch para rastreabilidade

## 🚀 Fluxo de Feature
1. **Criar branch** descritiva do contexto
2. **Escrever teste** (RED)
3. **Código mínimo** (GREEN)
4. **Refatorar** mantendo verde
5. **Integração** com isolamento
6. **Logs** estruturados

## 🐳 Container Commands
```bash
docker-compose exec backend npm test
docker-compose exec backend npm run test:watch
docker-compose exec backend npm run test:coverage
```

## ⚡ Performance Crítica
- **Índices**: organization_id em todas as tabelas
- **Paginação**: Sempre limit/offset
- **Queries**: N+1 prevention
- **Timeout**: 3s para LLM API

## 🛡️ Segurança Não-Negociável
- **JWT**: organizationId no payload
- **Validação**: Zod schemas na entrada
- **Sanitização**: Escape SQL injection
- **Rate limiting**: Endpoints públicos

## 📝 Convenções Rígidas
- **Interfaces**: Prefixo I (IProductRepository)
- **Services**: Sufixo Service (ProductService)
- **Errors**: Tipados (ValidationError, NotFoundError)
- **Async**: Sempre com try/catch ou asyncHandler

## 📋 .gitignore Essencial
Baseado na implementação atual (Next.js + FastAPI + PostgreSQL + Docker):

```gitignore
# Dependencies
node_modules/
__pycache__/
*.py[cod]

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
.next/
out/
build/
dist/

# Database
*.db
*.sqlite
*.sqlite3
postgres_data/

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Python virtual env
venv/
env/
ENV/

# Coverage
coverage/
.coverage
htmlcov/
.pytest_cache/

# Docker
.dockerignore

# Temporary
tmp/
temp/
*.tmp
```

---
**Regra de Ouro**: Código sem teste = código rejeitado 🚫