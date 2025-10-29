import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Ensure test env vars (e.g., DATABASE_URL) are set before tests run
  setupFiles: ['<rootDir>/src/__tests__/setupEnv.ts'],
  // After-env hooks run in the same process as tests; safe place to close shared resources
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/teardown.ts'],
};

export default config;
