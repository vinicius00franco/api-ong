
---

# Plano Ágil Detalhado (Revisado e Completo)

Aqui está o seu plano ágil com as adições necessárias para cobrir 100% da Etapa 1.

## Fase 1: Infraestrutura e Setup

### Objetivo
Criar a fundação técnica do projeto, permitindo que todos os serviços rodem localmente.

### Requisitos Cobertos
* **RF-SYS-01:** Setup local via Docker/Docker Compose.
* **RF-SYS-02:** Banco de Dados Relacional (PostgreSQL).
* **RF-SYS-03:** Script de Seed (mínimo 2 ONGs, 5 produtos cada).

### Tarefas / Histórias
* **Infra:** Configurar `docker-compose.yml` com os três serviços: `db` (PostgreSQL), `backend` (Next.js) e `llm-api` (FastAPI).
* **Infra:** Criar o `Dockerfile` para o backend.
* **Infra:** Criar o `Dockerfile` para o `llm-api`.
* **DB:** Escrever o script de migração `001_schema.sql` (ou equivalente) para criar todas as tabelas.
* **DB:** Escrever o script de seed `002_seed.sql` para popular o banco com os dados mínimos exigidos.

## Fase 2: Área da ONG (Autenticação e Tenancy)

### Objetivo
Permitir que uma ONG se autentique e gerencie apenas os seus próprios produtos com segurança.

### Requisitos Cobertos
* **RF-AUTH-01:** Login funcional.
* **RF-PROD-01:** CRUD de Produtos (Criar, Ler, Editar, Deletar).
* **RF-PROD-02:** Campos obrigatórios do Produto:
    * **RF-PROD-02.1:** `name` (texto).
    * **RF-PROD-02.2:** `description` (texto).
    * **RF-PROD-02.3:** `price` (suportar decimais).
    * **RF-PROD-02.4:** `category` (texto).
    * **RF-PROD-02.5:** `image_url` (texto/url).
    * **RF-PROD-02.6:** `stock_qty` (inteiro).
    * **RF-PROD-02.7:** `weight_grams` (inteiro).
* **RN-AUTH-01:** ID da Organização (`organization_id`) deve ser derivado do token/sessão (Crítico).
* **RN-AUTH-02:** Isolamento de dados entre ONGs (Crítico); ONG A não pode ver/editar dados da ONG B.

### Tarefas / Histórias
* **História (Auth):** Como usuário (ONG), quero me autenticar via endpoint de login para receber um token JWT.
* **História (CRUD):** Como usuário (ONG), quero poder Criar, Ler, Atualizar e Deletar produtos, preenchendo todos os campos obrigatórios.
* **Tarefa (Segurança):** Implementar middleware de segurança (ex: `withAuth`) no Next.js que:
    * Valida o token JWT.
    * Extrai o `organization_id` de dentro do token.
    * Garante que todas as queries (SELECT, INSERT, UPDATE, DELETE) usem apenas esse `organization_id`.

## Fase 3: Portal Público (Catálogo)

### Objetivo
Permitir que visitantes naveguem e filtrem os produtos de todas as ONGs.

### Requisitos Cobertos
* **RF-PUB-01:** Catálogo público paginado de todas as ONGs.
* **RF-PUB-02:** Filtro manual por categoria.
* **RF-PUB-03:** Filtro manual por faixa de preço.

### Tarefas / Histórias
* **História (Catálogo):** Como visitante, quero ver uma lista paginada de produtos de todas as ONGs.
* **História (Filtro):** Como visitante, quero poder refinar a lista de produtos enviando query params de `category` e `price_max`/`price_min`.

## Fase 4: Busca Inteligente (IA + Fallback)

### Objetivo
Implementar uma busca em linguagem natural que seja resiliente a falhas.

### Requisitos Cobertos
* **RF-SRCH-01:** Permitir busca por linguagem natural (ex: "doces até 50 reais").
* **RF-SRCH-02:** Converter texto em filtros estruturados (JSON) via API de LLM.
* **RF-SRCH-03:** Fallback crítico para busca simples (nome/descrição) se IA falhar ou exceder timeout.
* **RF-SRCH-04:** Exibir interpretação da busca ao usuário (ex: "Resultados para: Categoria=Doces...").
* **RN-SRCH-01:** Definir um timeout razoável para a chamada ao LLM.

### Tarefas / Histórias
* **História (Microserviço):** Como serviço backend (Next.js), quero enviar um texto para o `llm-api` (FastAPI) e receber um JSON de filtros estruturados.
* **História (Orquestração):** Como visitante, quero digitar "doces até 50 reais" e ver os resultados, mesmo que a IA falhe.
* **Sub-Tarefa (Next.js):** Implementar a lógica de orquestração:
    * Chamar o `llm-api` com um timeout (ex: 3 segundos).
    * Se falhar ou demorar, executar a busca fallback (ex: ILIKE no nome/descrição).
    * Retornar os resultados e a "interpretação aplicada" (ex: "Buscando por: Categoria=Doces" ou "Buscando por texto: doces").

## Fase 5: Pedidos (MVP)

### Objetivo
Persistir um registro do pedido no banco de dados, sem lógica de estoque (Etapa 1).

### Requisitos Cobertos
* **RF-ORD-01:** Permitir seleção de itens e quantidades.
* **RF-ORD-02:** Persistir Pedido (dados gerais) e Itens do Pedido (associados).
* **RN-ORD-01:** Escopo: Sem pagamento real ou baixa de estoque imediata.
* **RN-ORD-02:** Salvar o preço no momento da compra em cada item do pedido.
* **RN-ORD-03:** Salvar o `organization_id` em cada item do pedido.

### Tarefas / Histórias
* **História (Pedido):** Como visitante, quero enviar meu "carrinho" (lista de IDs de produto e quantidades) para um endpoint e ter meu pedido salvo.
* **Tarefa (Transação):** Implementar o endpoint `POST /api/public/orders` (Next.js) usando uma transação SQL para:
    * Inserir o registro na tabela `orders`.
    * Iterar pelos itens, buscar o `price` e `organization_id` atuais do produto.
    * Inserir os registros na tabela `order_items` com os dados buscados.

## Fase 6: Observabilidade e Entregáveis

### Objetivo
Garantir que o sistema seja observável e que a documentação atenda aos requisitos de entrega.

### Requisitos Cobertos
* **RF-SYS-04:** Logs estruturados (JSON).
* **RF-SYS-05:** Formato do log geral deve conter:
    * **RF-SYS-05.1:** `timestamp`.
    * **RF-SYS-05.2:** `rota`, `método`.
    * **RF-SYS-05.3:** `status` (http).
    * **RF-SYS-05.4:** `latência` (ms).
    * **RF-SYS-05.5:** `userId` (se aplicável).
    * **RF-SYS-05.6:** `organization_id` (se aplicável).
* **RF-SYS-06:** Formato do log de Busca Inteligente deve conter:
    * **RF-SYS-06.1:** `texto de entrada`.
    * **RF-SYS-06.2:** `filtros gerados` (pela IA).
    * **RF-SYS-06.3:** `sucesso da AI` (boolean).
    * **RF-SYS-06.4:** `fallback aplicado` (boolean).
* **RF-DOC-01:** Entregável: Repositório GitHub público.
* **RF-DOC-02:** Entregável: Código front-end e back-end.
* **RF-DOC-03:** Entregável: `.env.example` (com placeholders).
* **RF-DOC-04:** Entregável: `README.md` detalhado, contendo:
    * **RF-DOC-04.1:** Passo a passo completo para rodar localmente (Docker Compose).
    * **RF-DOC-04.2:** Esquema do banco de dados (ERD ou textual).
    * **RF-DOC-04.3:** Descrição das principais rotas da API (públicas e restritas).
    * **RF-DOC-04.4:** Detalhes da Busca AI (configuração, timeout, fallback).
    * **RF-DOC-04.5:** Detalhes dos Logs (como visualizar e formato).

### Tarefas / Histórias
* **Tarefa (Logs):** Implementar middleware de log (Next.js) para capturar e formatar logs gerais em JSON (Cobrem RF-SYS-04, RF-SYS-05).
* **Tarefa (Logs):** Adicionar log customizado no endpoint de Busca (`/api/public/search`) para registrar os campos específicos da IA e do fallback (Cobre RF-SYS-06).
* **Tarefa (Doc):** Escrever o `README.md` final, garantindo que todos os sub-requisitos RF-DOC-04.1 a RF-DOC-04.5 sejam atendidos.
* **Tarefa (Config):** Criar o arquivo `.env.example` final (Cobre RF-DOC-03).