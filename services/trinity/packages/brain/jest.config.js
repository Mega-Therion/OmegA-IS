/**
 * Jest Configuration for Brain Package
 *
 * Configures Jest for testing the Brain (Node.js) layer.
 * Used for contract tests, unit tests, and integration tests.
 */

module.exports = {
  displayName: 'brain',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'tests/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  testTimeout: 10000,
  verbose: true,
};
