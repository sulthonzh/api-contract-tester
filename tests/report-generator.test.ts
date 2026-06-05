import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportGenerator } from '../src/report-generator';
import { TestReport } from '../src/types';
import fs from 'fs';
import path from 'path';

// Mock fs
vi.mock('fs');
const mockFs = fs as any;

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockReportDir: string;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup test report directory
    mockReportDir = '/tmp/test-reports';
    reportGenerator = new ReportGenerator(mockReportDir);
    
    // Mock fs methods
    mockFs.existsSync = vi.fn();
    mockFs.mkdirSync = vi.fn();
    mockFs.writeFileSync = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create report directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});

      const generator = new ReportGenerator('/tmp/new-reports');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp/new-reports', { recursive: true });
    });

    it('should not create directory if it exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => {});

      const generator = new ReportGenerator('/tmp/existing-reports');
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('generateReport', () => {
    it('should generate JSON report', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'json'
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = reportGenerator.generateReport(mockReport);

      expect(result).toContain('/tmp/test-reports/test-report-2023-01-01T00-00-00-000');
      expect(result).toContain('.json');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.stringContaining('Test Suite')
      );
    });

    it('should generate YAML report', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'yaml'
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = reportGenerator.generateReport(mockReport);

      expect(result).toContain('/tmp/test-reports/test-report-2023-01-01T00-00-00-000');
      expect(result).toContain('.yaml');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.yaml'),
        expect.stringContaining('baseUrl')
      );
    });

    it('should generate HTML report', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'html'
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = reportGenerator.generateReport(mockReport);

      expect(result).toContain('/tmp/test-reports/test-report-2023-01-01T00-00-00-000');
      expect(result).toContain('.html');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>')
      );
    });

    it('should generate pretty report when format is pretty', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'pretty'
        }
      };

      const result = reportGenerator.generateReport(mockReport);

      expect(result).toContain('📋 API Contract Test Report');
      expect(result).toContain('Suite: Test Suite');
      expect(result).toContain('Success Rate: 80%');
    });

    it('should use pretty format as default', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20
        }
      };

      const result = reportGenerator.generateReport(mockReport);

      expect(result).toContain('📋 API Contract Test Report');
      expect(result).toContain('Suite: Test Suite');
    });
  });

  describe('generateJSONReport', () => {
    it('should create JSON file with correct content', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = (reportGenerator as any).generateJSONReport(mockReport, 'test-report');

      expect(result).toBe('/tmp/test-reports/test-report.json');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/test-reports/test-report.json',
        expect.stringContaining('"suite": "Test Suite"')
      );
    });
  });

  describe('generateYAMLReport', () => {
    it('should create YAML file with correct content', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = (reportGenerator as any).generateYAMLReport(mockReport, 'test-report');

      expect(result).toBe('/tmp/test-reports/test-report.yaml');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/test-reports/test-report.yaml',
        expect.stringContaining('suite: Test Suite')
      );
    });
  });

  describe('generateHTMLReport', () => {
    it('should create HTML file with correct content', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'html'
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = (reportGenerator as any).generateHTMLReport(mockReport, 'test-report');

      expect(result).toBe('/tmp/test-reports/test-report.html');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/test-reports/test-report.html',
        expect.stringContaining('<title>API Contract Test Report - Test Suite</title>')
      );
    });
  });

  describe('generateHTMLContent', () => {
    it('should generate HTML with correct structure', () => {
      const mockReport: TestReport = {
        suite: 'Test Suite',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 1000,
        totalTests: 10,
        passed: 8,
        failed: 2,
        warnings: 0,
        results: [],
        summary: {
          successRate: 80,
          averageResponseTime: 500,
          errorRate: 20,
          outputFormat: 'html'
        }
      };

      const html = (reportGenerator as any).generateHTMLContent(mockReport);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>API Contract Test Report - Test Suite</title>');
      expect(html).toContain('Test Suite');
      expect(html).toContain('8');
      expect(html).toContain('2');
      expect(html).toContain('10');
      expect(html).toContain('80%');
      expect(html).toContain('500ms');
    });
  });

  describe('generateResultHTML', () => {
    it('should generate HTML for passed result', () => {
      const mockResult = {
        endpoint: 'GET /api/users',
        method: 'GET',
        status: 'pass',
        message: 'Success',
        details: {},
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 100
      };

      const html = (reportGenerator as any).generateResultHTML(mockResult);

      expect(html).toContain('GET /api/users');
      expect(html).toContain('status-pass');
      expect(html).toContain('PASS');
      expect(html).toContain('Success');
      expect(html).toContain('100ms');
    });

    it('should generate HTML for failed result', () => {
      const mockResult = {
        endpoint: 'POST /api/users',
        method: 'POST',
        status: 'fail',
        message: 'Failed',
        details: {
          differences: ['Status code mismatch']
        },
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 200
      };

      const html = (reportGenerator as any).generateResultHTML(mockResult);

      expect(html).toContain('POST /api/users');
      expect(html).toContain('status-fail');
      expect(html).toContain('FAIL');
      expect(html).toContain('Failed');
      expect(html).toContain('Status code mismatch');
    });

    it('should generate HTML with differences', () => {
      const mockResult = {
        endpoint: 'PUT /api/users',
        method: 'PUT',
        status: 'warning',
        message: 'Warning',
        details: {
          differences: ['Header mismatch', 'Schema error']
        },
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        duration: 150
      };

      const html = (reportGenerator as any).generateResultHTML(mockResult);

      expect(html).toContain('Header mismatch');
      expect(html).toContain('Schema error');
      expect(html).toContain('• Header mismatch');
      expect(html).toContain('• Schema error');
    });
  });
});