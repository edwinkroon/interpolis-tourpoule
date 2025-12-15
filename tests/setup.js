/**
 * Jest setup file - runs before all tests
 * 
 * This file sets up the test environment, including:
 * - Global test utilities
 * - Mock configurations
 * - Environment variables for testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console.log during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test timeout (10 seconds)
jest.setTimeout(10000);

// Setup for React Testing Library (if testing frontend)
// This will be used when testing React components
if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom');
}

