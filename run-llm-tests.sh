#!/bin/bash
# Script para rodar testes da LLM API via Docker

set -e

echo "🚀 Building LLM API test image..."
docker build -f ./llm-api/Dockerfile.test -t llm-api-tests ./llm-api

echo "🧪 Running tests..."
docker run --rm \
  --env-file ./llm-api/.env \
  -v $(pwd)/llm-api/coverage:/app/coverage \
  llm-api-tests

echo "✓ Tests completed!"
echo "📊 Coverage report available at: ./llm-api/coverage/index.html"
