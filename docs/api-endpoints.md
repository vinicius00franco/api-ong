# Documentação da API - ONG System

Esta documentação descreve todos os endpoints da API do sistema de gerenciamento de produtos para ONGs, incluindo busca inteligente via IA.

## Formato de Resposta Padrão

Todas as respostas seguem o formato `ApiResponse<T>`:

```json
{
  "success": true,
  "data": T,
  "message": "string (opcional)"
}
```

Em caso de erro:

# Documentação da API - ONG System

Esta documentação descreve os endpoints da API do sistema (NestJS). Todas as rotas do backend possuem prefixo base:

- Base URL: http://localhost:3000/api

Inclui também a busca inteligente via IA (LLM) com fallback.

## Formato de Resposta Padrão

Todas as respostas seguem o formato `ApiResponse<T>`:

```json
{
  "success": true,
  "data": T,
  "message": "string (opcional)"
}
```

Em caso de erro:

```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": "Detalhes adicionais (opcional)"
}
```

## Autenticação

A maioria dos endpoints requer autenticação via JWT. Inclua o token no header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1) Autenticação

#### POST /api/auth/login
Realiza login e retorna um token JWT.

Corpo:
```json
{ "email": "string", "password": "string" }
```

Exemplo:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ong@example.com", "password": "password123"}'
```

#### POST /api/auth/register
Registra uma nova organização.

Corpo:
```json
{ "name": "string", "email": "string", "password": "string" }
```

Exemplo:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "ONG Exemplo", "email": "ong@example.com", "password": "password123"}'
```

#### POST /api/auth/users (criar usuário autenticado)
Cria usuário na organização do token (requer admin).

Exemplo:
```bash
curl -X POST http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria","email":"maria@example.com","password":"senha123","role":"user"}'
```

### 2) Produtos (Requer Autenticação)

#### POST /api/products
Cria um produto para a organização autenticada.

Corpo:
```json
{
  "name": "string",
  "description": "string",
  "price": 10.99,
  "categoryId": 1,
  "imageUrl": "http://example.com/image.jpg",
  "stockQty": 100,
  "weightGrams": 500
}
```

#### GET /api/products
Lista produtos da organização autenticada.

#### GET /api/products/:id
Obtém um produto por ID.

#### PUT /api/products/:id
Atualiza um produto.

#### DELETE /api/products/:id
Remove um produto.

### 3) Catálogo Público (Não requer autenticação)

#### GET /api/public/catalog
Lista produtos públicos (todas as ONGs) com filtros e paginação.

Query params (opcionais): `page`, `limit`, `category`, `priceMin`, `priceMax`.

Exemplo:
```bash
curl "http://localhost:3000/api/public/catalog?page=1&limit=10&category=Doce&priceMin=5&priceMax=20"
```

### 4) Busca Inteligente (Não requer autenticação)

#### GET /api/public/search
Busca em linguagem natural usando IA (Gemini 2.5 Flash‑Lite). Se a IA falhar/expirar, aplica fallback de texto.

Query:
- `q`: termo de busca

Resposta (IA usada):
```json
{
  "success": true,
  "data": {
    "interpretation": "Buscando por:, Termo='doces', Preço Máx.='20'",
    "ai_used": true,
    "fallback_applied": false,
    "data": [ { "id": 1, "name": "..." } ]
  }
}
```

Resposta (fallback aplicado):
```json
{
  "success": true,
  "data": {
    "interpretation": "Buscando por texto: \"doces até 20 reais\"",
    "ai_used": false,
    "fallback_applied": true,
    "data": []
  }
}
```

Notas:
- Timeout do LLM é configurável via `LLM_TIMEOUT` (padrão: 5000 ms).
- Os campos de flags retornam em snake_case (`ai_used`, `fallback_applied`).

Exemplo:
```bash
curl "http://localhost:3000/api/public/search?q=doces%20até%2020%20reais"
```

### 5) Organizações (Requer Autenticação)

#### POST /api/organizations
Cria organização (pode criar admin opcionalmente).

#### PATCH /api/organizations/:id
Atualiza organização (somente a própria organização pode alterar).

#### DELETE /api/organizations/:id
Remove organização (restrito à própria organização).

#### POST /api/organizations/:id/users
Cria usuário dentro da organização (requer admin da própria organização).

Exemplo:
```bash
curl -X POST http://localhost:3000/api/organizations/1/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@example.com", "password": "senha123", "role": "user"}'
```

### 6) Pedidos (Requer Autenticação)

#### POST /api/orders
Cria um novo pedido.

#### GET /api/orders
Lista pedidos da organização.

#### GET /api/orders/:id
Obtém um pedido por ID.

### 7) Categorias

#### GET /api/categories
Lista categorias disponíveis.

Exemplo:
```bash
curl http://localhost:3000/api/categories
```

### 8) Dashboard (Requer Autenticação)

#### GET /api/dashboard/stats
Obtém estatísticas agregadas.

Exemplo:
```bash
curl -H "Authorization: Bearer <jwt_token>" http://localhost:3000/api/dashboard/stats
```

#### GET /api/dashboard/activities
Obtém atividades recentes.

Exemplo:
```bash
curl -H "Authorization: Bearer <jwt_token>" http://localhost:3000/api/dashboard/activities
```

### 9) Health Check

#### GET /api/health
Verifica o status da aplicação.

Exemplo:
```bash
curl http://localhost:3000/api/health
```

## Códigos de Status HTTP

- `200`: Sucesso
- `201`: Criado
- `400`: Requisição inválida
- `401`: Não autorizado
- `404`: Não encontrado
- `500`: Erro interno do servidor

## Convenções

- Todos os campos JSON usam camelCase (exceto os campos específicos da busca inteligente que atualmente retornam `ai_used` e `fallback_applied`).
- Autenticação obrigatória para endpoints não públicos.
- Respostas seguem formato padronizado `ApiResponse<T>`.
- Timeout da IA configurável via `LLM_TIMEOUT` (padrão atual: 5000 ms).