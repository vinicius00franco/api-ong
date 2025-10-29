// Jest setup: provide sane defaults for env vars in local runs
// These values mirror docker-compose for local DB access via host port 5432.
// If already defined, we won't override.

process.env.DATABASE_URL ||= 'postgresql://user:password@localhost:5432/ong_db';
process.env.JWT_SECRET ||= 'test_secret';
