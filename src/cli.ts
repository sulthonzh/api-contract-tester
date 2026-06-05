#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ContractValidator } from './contract-validator';
import { ConfigManager } from './config-manager';
import { ReportGenerator } from './report-generator';
import { TestConfig, TestSuite, APISchema, ContractResult } from './types';
import fs from 'fs';
import path from 'path';

const program = new Command();
const configManager = new ConfigManager();
const reportGenerator = new ReportGenerator();

program
  .name('act')
  .description('API Contract Tester - Comprehensive tool for testing API contracts')
  .version('1.0.0');

// Test command
program
  .command('test')
  .description('Run API contract tests')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-s, --schema <path>', 'API schema file path')
  .option('-t, --suite <path>', 'Test suite file path')
  .option('-u, --url <url>', 'Base URL override')
  .option('-o, --output <format>', 'Output format (json|yaml|html|pretty)', 'pretty')
  .option('-v, --verbose', 'Verbose output')
  .option('-p, --parallel', 'Run tests in parallel')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('--retries <number>', 'Number of retries', parseInt)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔄 Loading configuration...'));
      
      // Load configuration
      let config = configManager.loadConfig();
      
      // Override config with command line options
      if (options.config) {
        const customConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));
        config = { ...config, ...customConfig };
      }
      
      if (options.url) config.baseUrl = options.url;
      if (options.output) config.outputFormat = options.output as any;
      if (options.verbose) config.verbose = options.verbose;
      if (options.parallel) config.parallel = options.parallel;
      if (options.timeout) config.timeout = options.timeout;
      if (options.retries) config.retries = options.retries;
      
      console.log(chalk.green('✅ Configuration loaded'));
      
      // Determine test source
      let schema: any;
      let testSource: string;
      
      if (options.schema) {
        if (!fs.existsSync(options.schema)) {
          console.error(chalk.red(`Schema file not found: ${options.schema}`));
          process.exit(1);
        }
        schema = configManager.loadSchema(options.schema);
        testSource = `Schema: ${options.schema}`;
      } else if (options.suite) {
        if (!fs.existsSync(options.suite)) {
          console.error(chalk.red(`Test suite file not found: ${options.suite}`));
          process.exit(1);
        }
        schema = configManager.loadTestSuite(options.suite);
        testSource = `Test Suite: ${options.suite}`;
      } else {
        // Interactive mode
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'sourceType',
            message: 'Choose test source:',
            choices: [
              { name: 'Use API schema file', value: 'schema' },
              { name: 'Use test suite file', value: 'suite' },
              { name: 'Create quick test', value: 'quick' }
            ]
          }
        ]);
        
        if (answers.sourceType === 'quick') {
          const quickSchema = generateQuickSchema(config.baseUrl);
          schema = quickSchema;
          testSource = 'Quick Test';
        } else {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'filePath',
              message: `Enter ${answers.sourceType} file path:`,
              validate: (input) => {
                if (!input) return 'File path is required';
                if (!fs.existsSync(input)) return `File not found: ${input}`;
                return true;
              }
            }
          ]);
          
          schema = answers.sourceType === 'schema' 
            ? configManager.loadSchema(answer.filePath) 
            : configManager.loadTestSuite(answer.filePath);
          testSource = `${answers.sourceType}: ${answer.filePath}`;
        }
      }
      
      console.log(chalk.blue(`\n🚀 Starting API contract tests`));
      console.log(chalk.gray(`Source: ${testSource}`));
      console.log(chalk.gray(`Base URL: ${config.baseUrl}\n`));
      
      // Run tests
      const validator = new ContractValidator(config.baseUrl, config.headers);
      console.log(chalk.blue('🚀 Running tests...'));
      
      const startTime = Date.now();
      let results: ContractResult[];
      
      if (schema.endpoints && Array.isArray(schema.endpoints)) {
        // It's an API schema or test suite
        if ('version' in schema) {
          // It's an API schema
          results = await validator.validateSchema(schema);
        } else {
          // It's a test suite
          results = [];
          for (const endpoint of schema.endpoints) {
            results.push(await validator.validateEndpoint(endpoint));
          }
        }
      } else {
        throw new Error('Invalid schema or test suite format');
      }
      
      const duration = Date.now() - startTime;
      console.log(chalk.green(`✅ Tests completed in ${duration}ms`));
      
      // Generate report
      const report = {
        suite: testSource,
        timestamp: new Date(),
        duration,
        totalTests: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length,
        warnings: results.filter(r => r.status === 'warning').length,
        results,
        summary: {
          successRate: results.length > 0 ? Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100) : 0,
          averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length || 0,
          errorRate: results.length > 0 ? Math.round((results.filter(r => r.status === 'fail').length / results.length) * 100) : 0,
          outputFormat: config.outputFormat
        }
      };
      
      // Generate and save report
      const reportPath = reportGenerator.generateReport(report);
      
      // Display results
      const summary = validator.generateSummary(results);
      console.log(summary);
      
      if (options.verbose) {
        results.forEach(result => {
          const color = result.status === 'pass' ? chalk.green : 
                       result.status === 'fail' ? chalk.red : chalk.yellow;
          const icon = result.status === 'pass' ? '✅' : 
                      result.status === 'fail' ? '❌' : '⚠️';
          
          console.log(`\n${icon} ${color(result.endpoint)}`);
          console.log(`   ${chalk.gray(result.message)}`);
          console.log(`   Duration: ${result.duration}ms`);
          
          if (result.details?.differences) {
            console.log(`   Differences:`);
            result.details.differences.forEach(diff => {
              console.log(`     ${chalk.yellow('•')} ${diff}`);
            });
          }
        });
      }
      
      console.log(chalk.green(`\n📄 Report saved to: ${reportPath}`));
      
      // Exit with appropriate code
      const exitCode = results.some(r => r.status === 'fail') ? 1 : 0;
      process.exit(exitCode);
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .option('-i, --init', 'Initialize configuration file')
  .option('-s, --show', 'Show current configuration')
  .option('-e, --edit', 'Edit configuration file')
  .action(async (options) => {
    try {
      if (options.init) {
        configManager.generateConfigTemplate(configManager['getDefaultConfigPath']());
        console.log(chalk.green(`✅ Configuration initialized: ${configManager['getDefaultConfigPath']()}`));
      } else if (options.show) {
        const config = configManager.loadConfig();
        console.log(chalk.blue('Current Configuration:'));
        console.log(JSON.stringify(config, null, 2));
      } else if (options.edit) {
        const configPath = configManager['getDefaultConfigPath']();
        console.log(chalk.blue(`Opening editor: ${configPath}`));
        // In a real implementation, you'd open an editor here
        console.log(chalk.yellow('Edit the file manually and save changes'));
      } else {
        console.log(chalk.yellow('Use --help to see config options'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Schema command
program
  .command('schema')
  .description('Manage API schemas')
  .option('-g, --generate <path>', 'Generate schema template')
  .option('-v, --validate <path>', 'Validate schema file')
  .action(async (options) => {
    try {
      if (options.generate) {
        configManager.generateSchemaTemplate(options.generate);
        console.log(chalk.green(`✅ Schema template generated: ${options.generate}`));
      } else if (options.validate) {
        try {
          const schema = configManager.loadSchema(options.validate);
          console.log(chalk.green(`✅ Schema is valid: ${options.validate}`));
          console.log(chalk.blue(`Endpoints: ${schema.endpoints.length}`));
          if (schema.security) {
            console.log(chalk.blue(`Security: ${schema.security.type}`));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Schema validation failed: ${error}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('Use --help to see schema options'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Generate quick schema function
function generateQuickSchema(baseUrl: string): APISchema {
  return {
    baseUrl,
    version: '1.0.0',
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        response: {
          status: 200,
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' }
            },
            required: ['status', 'timestamp']
          }
        }
      },
      {
        path: '/api/info',
        method: 'GET',
        response: {
          status: 200,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              uptime: { type: 'number' }
            },
            required: ['name', 'version']
          }
        }
      }
    ]
  };
}

// Export for testing
export { generateQuickSchema };

program.parse();