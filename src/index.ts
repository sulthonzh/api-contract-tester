#!/usr/bin/env node

/**
 * API Contract Tester
 * Comprehensive tool for testing API contracts between frontend and backend systems
 * 
 * This package provides a CLI tool for validating API contracts, testing endpoints,
 * and generating detailed reports. It supports multiple schema formats and output types.
 */

import { ContractValidator } from './contract-validator';
import { ConfigManager } from './config-manager';
import { ReportGenerator } from './report-generator';
import { TestConfig, APISchema, TestSuite, ContractResult, APIEndpoint, TestReport } from './types';

// Export main classes and types
export {
  ContractValidator,
  ConfigManager,
  ReportGenerator
};

export type {
  APIEndpoint,
  APISchema,
  ContractResult,
  TestSuite,
  TestReport,
  TestConfig
};

// Main CLI entry point
if (require.main === module) {
  // CLI will be handled by cli.ts
  console.log('API Contract Tester - Use the CLI interface: act --help');
}