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

### 1. Autenticação

#### POST /auth/login
**Descrição:** Realiza login de uma organização e retorna um token JWT.

**Corpo da Requisição:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "organizationId": "string"
  }
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ong@example.com", "password": "password123"}'
```

#### POST /auth/register
**Descrição:** Registra uma nova organização no sistema.

**Corpo da Requisição:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nome da ONG",
    "email": "ong@example.com"
  }
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "ONG Exemplo", "email": "ong@example.com", "password": "password123"}'
```

### 2. Produtos (Requer Autenticação)

#### POST /products
**Descrição:** Cria um novo produto para a organização autenticada.

**Corpo da Requisição:**
```json
{
  "name": "string",
  "description": "string",
  "price": "number",
  "categoryId": "number",
  "imageUrl": "string",
  "stockQty": "number",
  "weightGrams": "number"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "price": 10.99,
    "categoryId": 1,
    "imageUrl": "http://example.com/image.jpg",
    "stockQty": 100,
    "weightGrams": 500,
    "organizationId": "string",
    "createdAt": "2025-11-03T00:00:00.000Z"
  }
}
```

#### GET /products
**Descrição:** Lista todos os produtos da organização autenticada.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": 10.99,
      "categoryId": 1,
      "imageUrl": "http://example.com/image.jpg",
      "stockQty": 100,
      "weightGrams": 500,
      "organizationId": "string",
      "createdAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
```

#### GET /products/:id
**Descrição:** Obtém um produto específico por ID.

**Parâmetros de URL:**
- `id`: string (ID do produto)

**Resposta de Sucesso:** Mesmo formato que POST /products.

#### PUT /products/:id
**Descrição:** Atualiza um produto existente.

**Parâmetros de URL:**
- `id`: string (ID do produto)

**Corpo da Requisição:** (todos os campos são opcionais)
```json
{
  "name": "string (opcional)",
  "description": "string (opcional)",
  "price": "number (opcional)",
  "categoryId": "number (opcional)",
  "imageUrl": "string (opcional)",
  "stockQty": "number (opcional)",
  "weightGrams": "number (opcional)"
}
```

**Resposta de Sucesso:** Mesmo formato que POST /products.

#### DELETE /products/:id
**Descrição:** Remove um produto.

**Parâmetros de URL:**
- `id`: string (ID do produto)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": null
}
```

### 3. Catálogo Público

#### GET /public/catalog
**Descrição:** Lista produtos públicos de todas as ONGs com filtros e paginação.

**Parâmetros de Query (todos opcionais):**
- `page`: number (página, padrão: 1)
- `limit`: number (itens por página, máximo: 100, padrão: 20)
- `category`: string (filtro por categoria)
- `priceMin`: number (preço mínimo)
- `priceMax`: number (preço máximo)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "price": 10.99,
        "categoryId": 1,
        "imageUrl": "http://example.com/image.jpg",
        "stockQty": 100,
        "weightGrams": 500,
        "organizationId": "string",
        "createdAt": "2025-11-03T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

**Exemplo:**
```bash
curl "http://localhost:3000/public/catalog?page=1&limit=10&category=Doce&priceMin=5&priceMax=20"
```

### 4. Busca Inteligente (Requer Autenticação)

#### GET /public/search
**Descrição:** Realiza busca inteligente por linguagem natural usando IA.

**Parâmetros de Query:**
- `q`: string (termo de busca em linguagem natural)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "interpretation": "Interpretação da busca em linguagem natural",
    "aiUsed": true,
    "fallbackApplied": false,
    "data": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "price": 10.99,
        "categoryId": 1,
        "imageUrl": "http://example.com/image.jpg",
        "stockQty": 100,
        "weightGrams": 500,
        "organizationId": "string",
        "createdAt": "2025-11-03T00:00:00.000Z"
      }
    ]
  }
}
```

**Exemplo:**
```bash
curl "http://localhost:3000/public/search?q=doces até 20 reais"
```

### 6. Organizações (Requer Autenticação)

#### POST /organizations/:id/users
**Descrição:** Cria um novo usuário dentro da organização especificada. Apenas administradores da organização podem criar usuários.

**Parâmetros de URL:**
- `id`: number (ID da organização)

**Corpo da Requisição:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "string (opcional, padrão: 'user')" // 'user' ou 'admin'
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nome do Usuário",
    "email": "usuario@example.com",
    "role": "user",
    "organizationId": 1
  }
}
```

**Códigos de Erro:**
- `400`: Dados inválidos (validação Zod)
- `403`: Operação não permitida para esta organização (multi-tenancy)
- `409`: Usuário já existe com este email

**Exemplo:**
```bash
curl -X POST http://localhost:3000/organizations/1/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "João Silva", "email": "joao@example.com", "password": "senha123", "role": "user"}'
```

### 7. Pedidos (Requer Autenticação)

#### POST /orders
**Descrição:** Cria um novo pedido.

**Corpo da Requisição:**
```json
{
  "customerId": "number (opcional)",
  "items": [
    {
      "productId": "number",
      "quantity": "number"
    }
  ]
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customerId": 123,
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "productId": 456,
        "quantity": 5,
        "priceAtTime": 10.99,
        "organizationId": "org-123",
        "createdAt": "2025-11-03T00:00:00.000Z",
        "product": {
          "id": 456,
          "name": "Produto Exemplo",
          "price": 10.99
        }
      }
    ],
    "total": 54.95,
    "createdAt": "2025-11-03T00:00:00.000Z"
  }
}
```

#### GET /orders
**Descrição:** Lista todos os pedidos da organização.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customerId": 123,
      "items": [
        {
          "id": 1,
          "orderId": 1,
          "productId": 456,
          "quantity": 5,
          "priceAtTime": 10.99,
          "organizationId": "org-123",
          "createdAt": "2025-11-03T00:00:00.000Z",
          "product": {
            "id": 456,
            "name": "Produto Exemplo",
            "price": 10.99
          }
        }
      ],
      "total": 54.95,
      "createdAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
```

#### GET /orders/:id
**Descrição:** Obtém um pedido específico por ID.

**Parâmetros de URL:**
- `id`: number (ID do pedido)

**Resposta de Sucesso:** Mesmo formato que POST /orders.

### 8. Categorias

#### GET /categories
**Descrição:** Lista todas as categorias disponíveis.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Doce",
      "createdAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
```

**Exemplo:**
```bash
curl http://localhost:3000/categories
```

### 9. Health Check

#### GET /health
**Descrição:** Verifica o status da aplicação.

**Resposta de Sucesso:**
```json
{
  "status": "ok"
}
```

**Exemplo:**
```bash
curl http://localhost:3000/health
```

## Códigos de Status HTTP

- `200`: Sucesso
- `201`: Criado
- `400`: Requisição inválida
- `401`: Não autorizado
- `404`: Não encontrado
- `500`: Erro interno do servidor

## Convenções

- Todos os campos JSON usam **camelCase**
- Autenticação obrigatória para endpoints não públicos
- Respostas seguem formato padronizado `ApiResponse<T>`
- Timeout de 3 segundos para chamadas de IA</content>
<parameter name="filePath">/home/vinicius/Downloads/estudo/projetos-testes/fullstack-junior-ia/api-ong/docs/api-endpoints.md