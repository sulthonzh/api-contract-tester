import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContractValidator } from '../src/contract-validator';
import { APIEndpoint } from '../src/types';

// Mock axios
vi.mock('axios');
import axios from 'axios';

describe('ContractValidator', () => {
  let validator: ContractValidator;
  let mockAxios: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup axios mock
    mockAxios = {
      create: vi.fn(() => ({
        request: vi.fn()
      }))
    };
    
    (axios as any).create = mockAxios.create;
    
    // Create validator
    validator = new ContractValidator('http://localhost:3000');
  });

  describe('validateEndpoint', () => {
    it('should pass when endpoint matches expected schema', async () => {
      const endpoint: APIEndpoint = {
        path: '/api/users',
        method: 'GET',
        response: {
          status: 200,
          schema: {
            type: 'object',
            properties: {
              users: { type: 'array' }
            }
          }
        }
      };

      // Mock successful response
      mockAxios.create.mockReturnValue({
        request: vi.fn().mockResolvedValue({
          status: 200,
          headers: {},
          data: { users: [] }
        })
      });

      const result = await validator.validateEndpoint(endpoint);

      expect(result.status).toBe('pass');
      expect(result.message).toBe('Endpoint response matches expected schema');
      expect(result.endpoint).toBe('GET /api/users');
      expect(result.details?.response?.status).toBe(200);
      expect(result.details?.response?.data).toEqual({ users: [] });
    });

    it('should fail when status code does not match', async () => {
      const endpoint: APIEndpoint = {
        path: '/api/users',
        method: 'GET',
        response: {
          status: 200
        }
      };

      // Mock error response
      mockAxios.create.mockReturnValue({
        request: vi.fn().mockResolvedValue({
          status: 404,
          headers: {},
          data: { error: 'Not found' }
        })
      });

      const result = await validator.validateEndpoint(endpoint);

      expect(result.status).toBe('fail');
      expect(result.message).toBe('Status code mismatch: expected 200, got 404');
      expect(result.details?.differences).toEqual(['Status code: expected 200, got 404']);
    });

    it('should handle network errors gracefully', async () => {
      const endpoint: APIEndpoint = {
        path: '/api/users',
        method: 'GET'
      };

      // Mock network error
      mockAxios.create.mockReturnValue({
        request: vi.fn().mockRejectedValue(new Error('Network error'))
      });

      const result = await validator.validateEndpoint(endpoint);

      expect(result.status).toBe('fail');
      expect(result.message).toBe('Test execution error: Network error');
      expect(result.details?.error).toBe('Network error');
    });

    it('should handle POST requests with body', async () => {
      const endpoint: APIEndpoint = {
        path: '/api/users',
        method: 'POST',
        parameters: {
          body: { name: 'John Doe', email: 'john@example.com' }
        },
        response: {
          status: 201
        }
      };

      // Mock successful POST response
      mockAxios.create.mockReturnValue({
        request: vi.fn().mockResolvedValue({
          status: 201,
          headers: {},
          data: { id: '123', name: 'John Doe', email: 'john@example.com' }
        })
      });

      const result = await validator.validateEndpoint(endpoint);

      expect(result.status).toBe('pass');
      expect(result.endpoint).toBe('POST /api/users');
      expect(result.details?.request?.data).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });

    it('should handle query parameters', async () => {
      const endpoint: APIEndpoint = {
        path: '/api/users',
        method: 'GET',
        parameters: {
          query: { page: 1, limit: 10 }
        },
        response: {
          status: 200
        }
      };

      // Mock successful response with query params
      mockAxios.create.mockReturnValue({
        request: vi.fn().mockResolvedValue({
          status: 200,
          headers: {},
          data: { users: [] }
        })
      });

      const result = await validator.validateEndpoint(endpoint);

      expect(result.status).toBe('pass');
      expect(result.details?.request?.params).toEqual({ page: 1, limit: 10 });
    });
  });

  describe('validateSchema', () => {
    it('should validate all endpoints in schema', async () => {
      const schema = {
        baseUrl: 'http://localhost:3000',
        version: '1.0.0',
        endpoints: [
          {
            path: '/api/users',
            method: 'GET',
            response: { status: 200 }
          },
          {
            path: '/api/posts',
            method: 'GET',
            response: { status: 200 }
          }
        ]
      };

      // Mock successful responses
      mockAxios.create.mockReturnValue({
        request: vi.fn()
          .mockResolvedValueOnce({ status: 200, headers: {}, data: {} })
          .mockResolvedValueOnce({ status: 200, headers: {}, data: {} })
      });

      const results = await validator.validateSchema(schema);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('pass');
      expect(results[1].status).toBe('pass');
      expect(results[0].endpoint).toBe('GET /api/users');
      expect(results[1].endpoint).toBe('GET /api/posts');
    });

    it('should handle mixed success/failure results', async () => {
      const schema = {
        baseUrl: 'http://localhost:3000',
        version: '1.0.0',
        endpoints: [
          {
            path: '/api/users',
            method: 'GET',
            response: { status: 200 }
          },
          {
            path: '/api/posts',
            method: 'GET',
            response: { status: 500 }
          }
        ]
      };

      // Mock mixed responses
      mockAxios.create.mockReturnValue({
        request: vi.fn()
          .mockResolvedValueOnce({ status: 200, headers: {}, data: {} })
          .mockResolvedValueOnce({ status: 404, headers: {}, data: { error: 'Not found' } })
      });

      const results = await validator.validateSchema(schema);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('pass');
      expect(results[1].status).toBe('fail');
    });
  });

  describe('generateSummary', () => {
    it('should generate correct summary statistics', () => {
      const results = [
        { status: 'pass', duration: 100 },
        { status: 'pass', duration: 200 },
        { status: 'fail', duration: 150 },
        { status: 'warning', duration: 50 }
      ];

      const summary = validator.generateSummary(results);

      expect(summary).toContain('Total Tests: 4');
      expect(summary).toContain('Passed: 2');
      expect(summary).toContain('Failed: 1');
      expect(summary).toContain('Warnings: 1');
      expect(summary).toContain('Success Rate: 50%');
      expect(summary).toContain('Avg Response Time: 125.00ms');
    });

    it('should handle empty results', () => {
      const results: any[] = [];
      const summary = validator.generateSummary(results);

      expect(summary).toContain('Total Tests: 0');
      expect(summary).toContain('Success Rate: 0%');
      expect(summary).toContain('Avg Response Time: 0ms');
    });
  });
});