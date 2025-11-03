# AGENTS.md — Diretrizes enxutas e organizadas

## Objetivo
Fornecer regras práticas e obrigatórias para desenvolvimento (back-end NestJS + microserviços LLM + testes).

## Sumário executivo (rápido)
- TDD obrigatório (Red → Green → Refactor), cobertura mínima 80% nas regras de negócio críticas.
- Arquitetura por feature, injeção de dependências e repositórios com multi-tenancy.
- Busca inteligente: timeout 3s, fallback obrigatório.
- Logs estruturados JSON para requests e buscas.

## 1. Qualidade e processo
- TDD: escrever testes antes do código; arrange/act/assert.
- Cobertura alvo: 80% (priorizar auth e regras de negócio).
- Branching: cada mudança em sua branch com nome descritivo (`feature/`, `fix/`, `refactor/`).

## 2. Arquitetura e convenções
- Organizar `backend/src` por feature (cada feature = conjunto de arquivos: `XController.ts`, `XService.ts`, `XRepository.ts`, `XSchemas.ts`, `XTypes.ts`).
- Injeção de abstrações: usar interfaces `I*` e providers do Nest.
- Evitar barrels desnecessários; testes por feature em `src/__tests__/<feature>/`.

## 3. Multi-tenancy (MANDATÓRIO)
- Sempre filtrar por `organization_id` nas queries.
- Middleware auth deve extrair `organization_id` do JWT e injetar nos repositórios.
- Exemplo seguro: `SELECT ... WHERE id = $1 AND organization_id = $2`.

## 4. Busca inteligente (Fase 4)
- Timeout LLM: 3000 ms. Se LLM falhar/exceder timeout → aplicar fallback (ILIKE em `name`/`description`).
- Backend deve registrar e retornar: `interpretation`, `ai_used`, `fallback_applied`, `data`.

## 5. Logs e observabilidade
- Requisito mínimo (JSON): `{ timestamp, route, method, status, latency, userId?, organizationId? }`.
- Busca específica: `{ timestamp, searchQuery, generatedFilters, aiSuccess, fallbackApplied }`.

## 6. Segurança
- JWT deve carregar `organization_id`.
- Validar entradas com Zod nos `*Schemas.ts` antes de chamar services.
- Sanitizar entradas para prevenir SQL injection.

## 7. Testes (estratégia)
- Unit: services com mocks de repositories.
- Integration: APIs com banco real (containers/tests profile).
- Factories para dados de teste e limpeza entre testes.

## 8. Respostas e tratamento de erros
- Usar `ApiResponse<T>` uniforme:
  - Sucesso: `{ success: true, data, message? }`
  - Erro: `{ success: false, message, error?: any }`
- Decorador `@HandleErrors()` em handlers para normalizar respostas/exceções.

## 9. Operação com Docker
- Comandos úteis:
  - `docker-compose up --build`
  - `docker-compose exec backend npm test`

## 10. Checklist de entrega
- `.env.example` com placeholders
- README com instruções de run (Docker), endpoints principais e configuração da LLM
- Tests incluindo IA-success e IA-fallback

## 11. Convenções de API e JSON
- Todas as respostas JSON e parâmetros de requisição devem usar **camelCase** (ex.: `organizationId`, `accessToken`, `createdAt`).
- Evitar **snake_case** (ex.: `organization_id`, `access_token`, `created_at`).
- Aplicar consistentemente em tipos TypeScript, schemas Zod e respostas de API.

---
Regra de ouro: código sem teste = código rejeitado.