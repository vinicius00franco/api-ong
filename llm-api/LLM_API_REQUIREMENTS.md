## LLM API — Requisitos, Regras de Negócio, e Matriz de Rastreabilidade

Documento gerado para organizar os requisitos funcionais e não-funcionais da `llm-api`, definir regras de negócio (com siglas) e mapear os testes existentes que cobrem cada requisito.

Obs: este documento foi criado a partir da estrutura do repositório (`llm-api/`) e dos arquivos de teste presentes em `llm-api/tests/`. Há algumas suposições listadas na seção de *Assunções* — revise-as e ajuste conforme necessário.

---

## Escopo

- Componentes cobertos: controladores, serviços e repositórios dentro de `llm_api/` e os testes em `llm-api/tests/`.
- Objetivo: fornecer um contrato leve de requisitos e uma matriz que relacione requisitos a testes existentes, para facilitar TDD, cobertura e rastreabilidade.

## Assunções

- A pasta `llm_api/` contém os artefatos: `controllers/query_controller.py`, `services/query_service.py`, `repositories/query_repository.py` (e mocks), e `schemas.py`.
- Os testes existentes são: `test_endpoints.py`, `test_layers.py`, `test_query_repository_sql.py`, `test_schemas.py` (localizados em `llm-api/tests/`).
- Algumas exigências de segurança, rate-limiting e autenticação podem ser delegadas ao serviço que consome a LLM API; onde não houver testes cobrindo essas regras, o status será declarado como "Não coberto".

---

## Convenção de IDs e Siglas

- Cada requisito tem um identificador (RQ-XX), uma sigla curta (2–5 letras) e uma descrição curta.
- Exemplo: RQ-01 (SQLG) — Geração segura de SQL

---

## Requisitos (Funcionais e Não-Funcionais)

1. RQ-01 — SQLG (Geração de SQL segura)
   - Descrição: A API deve gerar consultas SQL válidas e seguras quando aplicável, evitando injeção e strings malformadas.
   - Critério de aceitação: Consultas geradas passam por validação sintática e por testes em `test_query_repository_sql.py`.

2. RQ-02 — SCH (Validação de Schema)
   - Descrição: Todas as entradas expostas pela API devem ser validadas conforme `llm_api/schemas.py`.
   - Critério de aceitação: Falhas de validação retornam erro estruturado e testes de validação cobrem os casos críticos (`test_schemas.py`).

3. RQ-03 — API (Contrato de Resposta)
   - Descrição: Endpoints devem retornar respostas padronizadas (ex.: ApiResponse { success, data, message }).
   - Critério de aceitação: Handlers/Controllers respeitam o contrato; testado em `test_endpoints.py`.

4. RQ-04 — LGT (Logs Estruturados)
   - Descrição: Requisições e eventos importantes (queries, latência, sucesso/erro) devem ser logados em JSON com campos mínimos: timestamp, route, method, status, latency, organizationId (quando disponível).
   - Critério de aceitação: Logs escritos em formato JSON; cobertura por verificações de integração/manual (pode não ter testes automáticos atualmente).

5. RQ-05 — ORG (Multi-tenancy / organizationId)
   - Descrição: Todas as operações que acessam dados devem considerar `organizationId` (quando aplicável) para isolar dados entre organizações.
   - Critério de aceitação: Repositórios aceitam/filtram por `organizationId`; testado parcialmente em `test_layers.py` / `test_query_repository_sql.py` dependendo da implementação.

6. RQ-06 — TMO (Timeout / Performance)
   - Descrição: Chamadas à LLM (ou geração de consultas) devem ter timeout configurável (ex.: 3s) e falhar de forma controlada se excederem esse prazo.
   - Critério de aceitação: Timeout implementado e testado com mocks; se não houver teste, marcar como não coberto.

7. RQ-07 — RRL (Rate Limiting e Proteção)
   - Descrição: Endpoints públicos devem aplicar rate limiting e proteção contra uso abusivo.
   - Critério de aceitação: Middleware/infra aplica rate limiting; tipicamente verificado por testes de integração ou e2e (possivelmente não presente hoje).

8. RQ-08 — TST (Testes e Cobertura)
   - Descrição: O projeto deve seguir TDD com cobertura objetiva mínima de 80% em camadas críticas (validation, business rules, SQL generation).
   - Critério de aceitação: Relatório de cobertura (lcov/coverage) e testes unitários/integrados. Atualmente há cobertura parcial gerada (ver `coverage/` se presente).

---

## Regras de Negócio (com siglas)

- RB-ORG: (ORG) Todas as consultas que retornam dados persistentes devem ser filtradas por `organizationId`.

- RB-SAFE_SQL: (SQLG) Qualquer SQL produzido automaticamente por uma LLM ou template deve ser validado e/ou parametrizado — não concatenar strings diretamente a partir de entrada do usuário.

- RB-VALIDATE: (SCH) Todas as entradas externas passam por validação de schema central (`schemas.py`) antes de chegar ao serviço.

- RB-LOG: (LGT) Logs de pesquisa devem incluir `searchQuery`, `generatedFilters`, `aiSuccess` e `fallbackApplied` (quando aplicável).

- RB-TIMEOUT: (TMO) Chamadas à LLM respeitam um timeout máximo (recomendado: 3s para produção). Falhas por timeout produzem resposta padronizada de erro.

- RB-RATE: (RRL) Endpoints públicos aplicam rate-limiting e proteções anti-abuso, com políticas configuráveis por ambiente.

---

## Matriz de Rastreabilidade (Requirements -> Testes)

| Requisito | Sigla | Testes existentes (arquivo) | Cobertura atual (estimada) | Observações |
|---|---:|---|---:|---|
| RQ-01 Geração SQL | SQLG | `test_query_repository_sql.py` | Coberto | Testa geração/validação de queries SQL (se adequadamente implementado). |
| RQ-02 Validação Schema | SCH | `test_schemas.py` | Coberto | Testes unitários de schemas. |
| RQ-03 Contrato API | API | `test_endpoints.py` | Parcial | Testes de endpoints exercitam o contrato; revisar asserts sobre formato de resposta. |
| RQ-04 Logs Estruturados | LGT | (nenhum específico) | Não coberto | Recomendado: testes de integração que verificam formato de logs (ou unidade com logger mock). |
| RQ-05 Multi-tenancy | ORG | `test_layers.py`, `test_query_repository_sql.py` | Parcial | Verificar se testes passam organizationId nos repositórios; se não, adicionar. |
| RQ-06 Timeout LLM | TMO | (nenhum específico) | Não coberto | Recomendado: testes com mock de LLM para simular timeout. |
| RQ-07 Rate Limiting | RRL | (nenhum) | Não coberto | Infra/middleware faltante — adicionar testes e e2e. |
| RQ-08 Testes e Cobertura | TST | `test_*` conjunto | Parcial | Há testes, mas revisar cobertura e meta 80%. |

> Nota: a coluna "Cobertura atual" é uma estimativa baseada nos nomes dos testes e na presença dos arquivos em `llm-api/tests/`. É recomendado executar a suíte e gerar relatório de cobertura para validação precisa.

---

## Testes Existentes — Resumo rápido

- `tests/test_endpoints.py`
  - Finalidade (inferida): testar respostas dos endpoints HTTP (contrato, erros comuns, status codes).

- `tests/test_layers.py`
  - Finalidade (inferida): testar integração entre camadas (controller -> service -> repository) com mocks, garantindo regras de negócio.

- `tests/test_query_repository_sql.py`
  - Finalidade (inferida): validar a construção e execução (ou simulação) de queries SQL geradas pelo `query_repository`.

- `tests/test_schemas.py`
  - Finalidade (inferida): validar validações de entrada definidas em `schemas.py`.

Se desejar, posso abrir cada arquivo em `llm-api/tests/` e extrair os casos de teste exatos e as assertions para preencher a matriz com mais precisão.

---

## Gaps Identificados e Recomendações (prioritárias)

1. Adicionar testes para timeout da LLM (RQ-06). Criar teste que simule latência alta e verifique fallback/control flow.
2. Cobrir logs estruturados (RQ-04) com testes que inspecionem mensagens de log (ou ao menos o payload enviado ao logger).
3. Garantir que todos os repositórios aceitam `organizationId` e escrever testes que confirmem filtragem por `organizationId` (RQ-05).
4. Implementar/validar rate limiting em ambiente de staging e cobrir com testes de integração (RQ-07).
5. Gerar relatório de cobertura e mirar 80% para as camadas críticas (RQ-08).

---

## Próximos Passos (ações sugeridas)

- Executar a suíte de testes atual e gerar relatório de cobertura (ex.: `pytest --cov=llm_api`).
- Se quiser, eu posso: (A) extrair automaticamente os nomes de teste e assertions dos arquivos de teste e atualizar a matriz com precisão; (B) criar testes faltantes (timeout, logs, org filter) como PR separado.

---

## Contato e versão

Arquivo gerado automaticamente. Por favor reveja as *Assunções* e me diga se quer que eu:

- torne as entradas ainda mais detalhadas (mapeando linhas/funções específicas), ou
- gere os testes faltantes automaticamente e execute a suíte localmente.
