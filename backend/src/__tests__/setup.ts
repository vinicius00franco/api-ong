// Test setup file
import { jest } from '@jest/globals'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = 'test_secret'
process.env.LLM_API_URL = 'http://localhost:8000'
process.env.LLM_TIMEOUT_MS = '3000'

// Global test timeout
jest.setTimeout(10000)

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}