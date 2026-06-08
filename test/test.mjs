#!/usr/bin/env node

/**
 * Standalone integration tests for api-contract-tester
 * Uses Node.js built-in test runner — zero external test dependencies
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import compiled modules
const { ConfigManager } = await import('../dist/config-manager.js');
const { ReportGenerator } = await import('../dist/report-generator.js');
const { ContractValidator } = await import('../dist/contract-validator.js');

// ── Helpers ──────────────────────────────────────────────

function makeReport(overrides = {}) {
  return {
    suite: 'test-suite',
    timestamp: new Date('2026-01-01T00:00:00Z'),
    duration: 150,
    totalTests: 2,
    passed: 1,
    failed: 1,
    warnings: 0,
    results: [
      {
        endpoint: 'GET /api/users',
        method: 'GET',
        status: 'pass',
        message: 'OK',
        details: { request: { method: 'get', url: '/api/users' }, response: { status: 200 } },
        timestamp: new Date('2026-01-01T00:00:00Z'),
        duration: 50,
      },
      {
        endpoint: 'POST /api/users',
        method: 'POST',
        status: 'fail',
        message: 'Status mismatch',
        details: {
          request: { method: 'post', url: '/api/users' },
          response: { status: 500 },
          differences: ['Status code: expected 201, got 500'],
        },
        timestamp: new Date('2026-01-01T00:00:01Z'),
        duration: 100,
      },
    ],
    summary: {
      successRate: 50,
      averageResponseTime: 75,
      errorRate: 50,
    },
    ...overrides,
  };
}

// ── ConfigManager Tests ──────────────────────────────────

describe('ConfigManager', () => {
  it('loads default config when no file exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-test-'));
    const cfgPath = path.join(dir, 'nonexistent.json');
    const cm = new ConfigManager(cfgPath);
    const config = cm.loadConfig();
    assert.equal(config.baseUrl, 'http://localhost:3000');
    assert.equal(config.timeout, 10000);
    assert.equal(config.retries, 3);
    assert.equal(config.outputFormat, 'pretty');
    fs.rmSync(dir, { recursive: true });
  });

  it('saves and loads custom config', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-test-'));
    const cfgPath = path.join(dir, 'config.json');
    const cm = new ConfigManager(cfgPath);
    cm.saveConfig({ baseUrl: 'https://api.example.com', timeout: 5000 });
    const loaded = cm.loadConfig();
    assert.equal(loaded.baseUrl, 'https://api.example.com');
    assert.equal(loaded.timeout, 5000);
    // defaults merged in
    assert.equal(loaded.retries, 3);
    fs.rmSync(dir, { recursive: true });
  });

  it('merges headers from default and user config', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-test-'));
    const cfgPath = path.join(dir, 'config.json');
    const cm = new ConfigManager(cfgPath);
    cm.saveConfig({
      baseUrl: 'http://localhost:4000',
      headers: { Authorization: 'Bearer tok' },
    });
    const loaded = cm.loadConfig();
    assert.equal(loaded.headers.Authorization, 'Bearer tok');
    assert.equal(loaded.headers['Content-Type'], 'application/json');
    fs.rmSync(dir, { recursive: true });
  });

  it('falls back to default config on error', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-test-'));
    const cfgPath = path.join(dir, 'config.json');
    // write invalid JSON
    fs.writeFileSync(cfgPath, '{ invalid json }');
    const cm = new ConfigManager(cfgPath);
    const config = cm.loadConfig();
    assert.equal(config.baseUrl, 'http://localhost:3000');
    fs.rmSync(dir, { recursive: true });
  });

  it('respects ACT_CONFIG_PATH env var', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-test-'));
    const cfgPath = path.join(dir, 'env-config.json');
    process.env.ACT_CONFIG_PATH = cfgPath;
    const cm = new ConfigManager();
    cm.saveConfig({ baseUrl: 'http://env-test.com' });
    const loaded = cm.loadConfig();
    assert.equal(loaded.baseUrl, 'http://env-test.com');
    delete process.env.ACT_CONFIG_PATH;
    fs.rmSync(dir, { recursive: true });
  });
});

// ── ReportGenerator Tests ────────────────────────────────

describe('ReportGenerator', () => {
  it('generates JSON report file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-report-'));
    const rg = new ReportGenerator(dir);
    const report = makeReport({ summary: { ...makeReport().summary, outputFormat: 'json' } });
    const filePath = rg.generateReport(report);
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(content.suite, 'test-suite');
    assert.equal(content.totalTests, 2);
    fs.rmSync(dir, { recursive: true });
  });

  it('generates YAML report file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-report-'));
    const rg = new ReportGenerator(dir);
    const report = makeReport({ summary: { ...makeReport().summary, outputFormat: 'yaml' } });
    const filePath = rg.generateReport(report);
    assert.ok(filePath.endsWith('.yaml'));
    assert.ok(fs.existsSync(filePath));
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('test-suite'));
    fs.rmSync(dir, { recursive: true });
  });

  it('generates HTML report with results', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-report-'));
    const rg = new ReportGenerator(dir);
    const report = makeReport({ summary: { ...makeReport().summary, outputFormat: 'html' } });
    const filePath = rg.generateReport(report);
    assert.ok(filePath.endsWith('.html'));
    const html = fs.readFileSync(filePath, 'utf8');
    assert.ok(html.includes('GET /api/users'));
    assert.ok(html.includes('POST /api/users'));
    assert.ok(html.includes('status-pass'));
    assert.ok(html.includes('status-fail'));
    assert.ok(html.includes('Status mismatch'));
    fs.rmSync(dir, { recursive: true });
  });

  it('generates pretty (console) report', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'act-report-'));
    const rg = new ReportGenerator(dir);
    const report = makeReport();
    const output = rg.generateReport(report);
    // pretty report returns the string, not a file path
    assert.ok(output.includes('API Contract Test Report'));
    assert.ok(output.includes('test-suite'));
    assert.ok(output.includes('GET /api/users'));
    fs.rmSync(dir, { recursive: true });
  });

  it('creates report directory if missing', () => {
    const dir = path.join(os.tmpdir(), `act-report-new-${Date.now()}`);
    assert.ok(!fs.existsSync(dir));
    const rg = new ReportGenerator(dir);
    assert.ok(fs.existsSync(dir));
    fs.rmSync(dir, { recursive: true });
  });
});

// ── ContractValidator Tests ──────────────────────────────

describe('ContractValidator', () => {
  it('constructs with baseURL and default headers', () => {
    const cv = new ContractValidator('http://localhost:3000', {
      Authorization: 'Bearer test',
    });
    assert.ok(cv);
  });

  it('returns fail for unreachable endpoint', async () => {
    const cv = new ContractValidator('http://localhost:1');
    const result = await cv.validateEndpoint({
      path: '/test',
      method: 'GET',
      response: { status: 200 },
    });
    assert.equal(result.status, 'fail');
    assert.ok(result.duration > 0);
    assert.ok(result.message.includes('error') || result.message.includes('Error') || result.message.includes('No response'));
  });

  it('returns fail for non-existent host', async () => {
    const cv = new ContractValidator('http://this-host-does-not-exist-99999.invalid');
    const result = await cv.validateEndpoint({
      path: '/api',
      method: 'GET',
    });
    assert.equal(result.status, 'fail');
    assert.ok(result.endpoint.includes('GET'));
    assert.ok(result.endpoint.includes('/api'));
  });

  it('includes request details in error result', async () => {
    const cv = new ContractValidator('http://localhost:1');
    const result = await cv.validateEndpoint({
      path: '/data',
      method: 'POST',
      parameters: { body: { name: 'test' } },
      response: { status: 201 },
    });
    assert.equal(result.status, 'fail');
    assert.ok(result.details);
  });
});

// ── Types / Structure Tests ──────────────────────────────

describe('Report structure', () => {
  it('report with all passes', () => {
    const report = makeReport({
      totalTests: 1,
      passed: 1,
      failed: 0,
      warnings: 0,
      results: [
        {
          endpoint: 'GET /health',
          method: 'GET',
          status: 'pass',
          message: 'OK',
          timestamp: new Date(),
          duration: 10,
        },
      ],
      summary: { successRate: 100, averageResponseTime: 10, errorRate: 0 },
    });
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].status, 'pass');
    assert.equal(report.summary.successRate, 100);
  });

  it('report with warnings', () => {
    const report = makeReport({
      totalTests: 1,
      passed: 0,
      failed: 0,
      warnings: 1,
      results: [
        {
          endpoint: 'GET /slow',
          method: 'GET',
          status: 'warning',
          message: 'Slow response',
          details: { differences: ['Response time exceeded threshold'] },
          timestamp: new Date(),
          duration: 5000,
        },
      ],
      summary: { successRate: 0, averageResponseTime: 5000, errorRate: 0 },
    });
    assert.equal(report.results[0].status, 'warning');
    assert.equal(report.warnings, 1);
    assert.deepEqual(report.results[0].details.differences, ['Response time exceeded threshold']);
  });

  it('empty results report', () => {
    const report = makeReport({
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      results: [],
      summary: { successRate: 0, averageResponseTime: 0, errorRate: 0 },
    });
    assert.equal(report.results.length, 0);
    assert.equal(report.totalTests, 0);
  });
});
