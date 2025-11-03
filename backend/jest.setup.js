// Jest global setup for tests
// Set database URL for integration tests to use local Postgres from docker-compose
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ong_db';
// Set LLM API URL for tests (mock URL)
process.env.LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:8000';
