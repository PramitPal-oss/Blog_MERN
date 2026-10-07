module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  setupFiles: ['<rootDir>/src/tests/setEnvVars.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { useESM: true, diagnostics: { ignoreCodes: [151002] } }] },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/types/**', '!src/tests/**'],
  coverageThreshold: { global: { branches: 40, functions: 55, lines: 75, statements: 70 } }
};
