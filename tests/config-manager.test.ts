import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../src/config-manager';
import { TestConfig } from '../src/types';
import fs from 'fs';
import path from 'path';

// Mock fs
vi.mock('fs');
const mockFs = fs as any;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockConfigPath: string;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup test config path
    mockConfigPath = '/tmp/test-config.json';
    configManager = new ConfigManager(mockConfigPath);
    
    // Mock fs.existsSync behavior
    mockFs.existsSync = vi.fn();
    mockFs.readFileSync = vi.fn();
    mockFs.writeFileSync = vi.fn();
    mockFs.mkdirSync = vi.fn();
  });

  afterEach(() => {
    // Restore original fs methods
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      const config = configManager.loadConfig();

      expect(config.baseUrl).toBe('http://localhost:3000');
      expect(config.timeout).toBe(10000);
      expect(config.retries).toBe(3);
      expect(config.parallel).toBe(false);
      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'api-contract-tester/1.0.0'
      });
    });

    it('should load and merge user config when file exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => {});
      
      const userConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 2
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

      const config = configManager.loadConfig();

      expect(config.baseUrl).toBe('https://api.example.com');
      expect(config.timeout).toBe(5000);
      expect(config.retries).toBe(2);
      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'api-contract-tester/1.0.0'
      });
    });

    it('should merge headers correctly', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => {});
      
      const userConfig = {
        headers: {
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/vnd.api+json'
        }
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

      const config = configManager.loadConfig();

      expect(config.headers).toEqual({
        'Content-Type': 'application/vnd.api+json',
        'User-Agent': 'api-contract-tester/1.0.0',
        'Authorization': 'Bearer token123'
      });
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      const config: TestConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 5000
      };

      configManager.saveConfig(config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(config, null, 2)
      );
    });
  });

  describe('loadSchema', () => {
    it('should load JSON schema file', () => {
      const schemaPath = '/tmp/schema.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        baseUrl: 'http://localhost:3000',
        endpoints: []
      }));

      const schema = configManager.loadSchema(schemaPath);

      expect(schema.baseUrl).toBe('http://localhost:3000');
      expect(schema.endpoints).toEqual([]);
    });

    it('should load YAML schema file', () => {
      const schemaPath = '/tmp/schema.yaml';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(`baseUrl: http://localhost:3000
endpoints: []`);

      const schema = configManager.loadSchema(schemaPath);

      expect(schema.baseUrl).toBe('http://localhost:3000');
      expect(schema.endpoints).toEqual([]);
    });

    it('should throw error when schema file not found', () => {
      const schemaPath = '/tmp/nonexistent.json';
      mockFs.existsSync.mockReturnValue(false);

      expect(() => configManager.loadSchema(schemaPath)).toThrow('Schema file not found');
    });

    it('should throw error for unsupported format', () => {
      const schemaPath = '/tmp/schema.txt';
      mockFs.existsSync.mockReturnValue(true);

      expect(() => configManager.loadSchema(schemaPath)).toThrow('Unsupported schema format');
    });
  });

  describe('loadTestSuite', () => {
    it('should load JSON test suite file', () => {
      const suitePath = '/tmp/suite.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'Test Suite',
        baseUrl: 'http://localhost:3000',
        endpoints: []
      }));

      const suite = configManager.loadTestSuite(suitePath);

      expect(suite.name).toBe('Test Suite');
      expect(suite.baseUrl).toBe('http://localhost:3000');
      expect(suite.endpoints).toEqual([]);
    });

    it('should load YAML test suite file', () => {
      const suitePath = '/tmp/suite.yaml';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(`name: Test Suite
baseUrl: http://localhost:3000
endpoints: []`);

      const suite = configManager.loadTestSuite(suitePath);

      expect(suite.name).toBe('Test Suite');
      expect(suite.baseUrl).toBe('http://localhost:3000');
    });
  });

  describe('generateSchemaTemplate', () => {
    it('should generate JSON schema template', () => {
      const schemaPath = '/tmp/template.json';
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      configManager.generateSchemaTemplate(schemaPath);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        schemaPath,
        expect.stringContaining('"baseUrl": "http://localhost:3000"')
      );
    });

    it('should generate YAML schema template', () => {
      const schemaPath = '/tmp/template.yaml';
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      configManager.generateSchemaTemplate(schemaPath);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        schemaPath,
        expect.stringContaining('baseUrl: http://localhost:3000')
      );
    });
  });

  describe('generateConfigTemplate', () => {
    it('should generate config template', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      configManager.generateConfigTemplate(mockConfigPath);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('"baseUrl": "http://localhost:3000"')
      );
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config: TestConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 10000,
        retries: 3,
        outputFormat: 'json'
      };

      const errors = configManager.validateConfig(config);

      expect(errors).toEqual([]);
    });

    it('should detect missing baseUrl', () => {
      const config = {
        timeout: 10000
      } as TestConfig;

      const errors = configManager.validateConfig(config);

      expect(errors).toContain('baseUrl is required');
    });

    it('should detect invalid baseUrl format', () => {
      const config = {
        baseUrl: 'invalid-url',
        timeout: 10000
      } as TestConfig;

      const errors = configManager.validateConfig(config);

      expect(errors).toContain('baseUrl must start with http:// or https://');
    });

    it('should detect invalid timeout range', () => {
      const config = {
        baseUrl: 'https://api.example.com',
        timeout: 500 // Less than 1000
      } as TestConfig;

      const errors = configManager.validateConfig(config);

      expect(errors).toContain('timeout must be between 1000 and 300000 milliseconds');
    });

    it('should detect invalid retries range', () => {
      const config = {
        baseUrl: 'https://api.example.com',
        retries: 15 // More than 10
      } as TestConfig;

      const errors = configManager.validateConfig(config);

      expect(errors).toContain('retries must be between 0 and 10');
    });

    it('should detect invalid output format', () => {
      const config = {
        baseUrl: 'https://api.example.com',
        outputFormat: 'invalid' as any
      } as TestConfig;

      const errors = configManager.validateConfig(config);

      expect(errors).toContain('outputFormat must be one of: json, yaml, html, pretty');
    });
  });
});