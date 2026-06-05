import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { program } from '../src/cli';
import inquirer from 'inquirer';

// Mock dependencies
vi.mock('inquirer');
vi.mock('../src/contract-validator');
vi.mock('../src/config-manager');
vi.mock('../src/report-generator');
vi.mock('fs');

import { ContractValidator } from '../src/contract-validator';
import { ConfigManager } from '../src/config-manager';
import { ReportGenerator } from '../src/report-generator';
import { generateQuickSchema } from '../src/cli';

const mockInquirer = inquirer as any;
const mockContractValidator = ContractValidator as any;
const mockConfigManager = ConfigManager as any;
const mockReportGenerator = ReportGenerator as any;
const mockFs = require('fs') as any;

describe('CLI', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup test config manager
    mockConfigManager.mockImplementation(() => ({
      loadConfig: vi.fn().mockReturnValue({
        baseUrl: 'http://localhost:3000',
        outputFormat: 'pretty',
        verbose: false,
        parallel: false,
        timeout: 10000,
        retries: 3
      }),
      loadSchema: vi.fn().mockReturnValue({
        baseUrl: 'http://localhost:3000',
        version: '1.0.0',
        endpoints: []
      }),
      loadTestSuite: vi.fn().mockReturnValue({
        name: 'Test Suite',
        baseUrl: 'http://localhost:3000',
        endpoints: []
      }),
      generateSchemaTemplate: vi.fn(),
      generateConfigTemplate: vi.fn(),
      validateConfig: vi.fn().mockReturnValue([])
    }));
    
    // Setup mock validator
    mockContractValidator.mockImplementation(() => ({
      validateSchema: vi.fn().mockResolvedValue([]),
      validateEndpoint: vi.fn().mockResolvedValue({}),
      generateSummary: vi.fn().mockReturnValue('Summary')
    }));
    
    // Setup mock report generator
    mockReportGenerator.mockImplementation(() => ({
      generateReport: vi.fn().mockReturnValue('/tmp/report.json')
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateQuickSchema', () => {
    it('should generate quick schema with default endpoints', () => {
      const schema = generateQuickSchema('http://localhost:3000');
      
      expect(schema.baseUrl).toBe('http://localhost:3000');
      expect(schema.version).toBe('1.0.0');
      expect(schema.endpoints).toHaveLength(2);
      expect(schema.endpoints[0].path).toBe('/health');
      expect(schema.endpoints[1].path).toBe('/api/info');
    });
  });

  describe('test command', () => {
    it('should generate quick schema correctly', () => {
      const schema = generateQuickSchema('http://localhost:3000');
      expect(schema.baseUrl).toBe('http://localhost:3000');
      expect(schema.version).toBe('1.0.0');
      expect(schema.endpoints).toHaveLength(2);
    });
  });

  describe('config command', () => {
    it('should initialize configuration', async () => {
      await program.parse(['node', 'act', 'config', '--init']);
      
      expect(mockConfigManager.prototype.generateConfigTemplate).toHaveBeenCalled();
    });

    it('should show configuration', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      await program.parse(['node', 'act', 'config', '--show']);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current Configuration:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000'));
      
      consoleSpy.mockRestore();
    });

    it('should edit configuration', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      await program.parse(['node', 'act', 'config', '--edit']);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Opening editor:'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('schema command', () => {
    it('should generate schema template', async () => {
      await program.parse(['node', 'act', 'schema', '--generate', 'schema.json']);
      
      expect(mockConfigManager.prototype.generateSchemaTemplate).toHaveBeenCalledWith('schema.json');
    });

    it('should validate schema file', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      const fsMock = vi.fn().mockReturnValue(true);
      vi.doMock('fs', () => ({
        existsSync: fsMock
      }));

      await program.parse(['node', 'act', 'schema', '--validate', 'schema.json']);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Schema is valid'));
      
      consoleSpy.mockRestore();
    });
  });
});