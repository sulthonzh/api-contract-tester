import { APIEndpoint, APISchema, ContractResult } from './types';
import Ajv from 'ajv';
import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';

export class ContractValidator {
  private ajv: Ajv;
  private client: AxiosInstance;

  constructor(baseUrl: string, defaultHeaders?: Record<string, string>) {
    this.ajv = new Ajv({ allErrors: true });
    this.client = axios.create({
      baseURL: baseUrl,
      headers: defaultHeaders,
      timeout: 10000,
    });
  }

  async validateEndpoint(endpoint: APIEndpoint): Promise<ContractResult> {
    const startTime = Date.now();
    
    try {
      const config: any = {
        method: endpoint.method.toLowerCase() as any,
        url: endpoint.path,
        headers: endpoint.headers || {},
      };

      if (endpoint.parameters?.query) {
        config.params = endpoint.parameters.query;
      }

      if (endpoint.parameters?.body) {
        config.data = endpoint.parameters.body;
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }

      const response = await this.client.request(config);
      const duration = Date.now() - startTime;

      // Validate response if expected response is defined
      let validationMessage = 'Endpoint response matches expected schema';
      let status: 'pass' | 'fail' | 'warning' = 'pass';
      let details: any = {
        request: config,
        response: {
          status: response.status,
          headers: response.headers,
          data: response.data,
        },
        expected: endpoint.response,
      };

      if (endpoint.response) {
        if (endpoint.response.status !== response.status) {
          status = 'fail';
          validationMessage = `Status code mismatch: expected ${endpoint.response.status}, got ${response.status}`;
          details.differences = [`Status code: expected ${endpoint.response.status}, got ${response.status}`];
        }

        if (endpoint.response.schema) {
          const valid = this.ajv.validate(endpoint.response.schema, response.data);
          if (!valid && this.ajv.errors) {
            status = 'fail';
            validationMessage = 'Response schema validation failed';
            details.differences = this.ajv.errors.map(error => 
              `Schema error: ${error.instancePath} ${error.message}`
            );
          }
        }

        if (endpoint.response.headers) {
          const headerDifferences: string[] = [];
          for (const [key, expectedValue] of Object.entries(endpoint.response.headers)) {
            const actualValue = response.headers[key.toLowerCase()];
            if (actualValue !== expectedValue) {
              headerDifferences.push(`Header ${key}: expected ${expectedValue}, got ${actualValue}`);
            }
          }
          if (headerDifferences.length > 0) {
            status = status === 'pass' ? 'warning' : status;
            if (!details.differences) details.differences = [];
            details.differences.push(...headerDifferences);
            validationMessage += ` (Header mismatches: ${headerDifferences.length} found)`;
          }
        }
      }

      return {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        status,
        message: validationMessage,
        details,
        timestamp: new Date(),
        duration,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      let message = `Endpoint test failed`;
      let details: any = {
        request: error.config,
      };

      if (error.response) {
        details.response = {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        };
        message = `HTTP ${error.response.status} error: ${error.response.statusText}`;
      } else if (error.request) {
        details.error = 'No response received';
        message = 'Network error: No response received';
      } else {
        details.error = error.message;
        message = `Test execution error: ${error.message}`;
      }

      return {
        endpoint: `${endpoint.method} ${endpoint.path}`,
        method: endpoint.method,
        status: 'fail',
        message,
        details,
        timestamp: new Date(),
        duration,
      };
    }
  }

  async validateSchema(schema: APISchema): Promise<ContractResult[]> {
    const results: ContractResult[] = [];
    
    console.log(chalk.blue(`🔍 Validating ${schema.endpoints.length} endpoints in schema...`));
    
    for (const endpoint of schema.endpoints) {
      console.log(chalk.gray(`  Testing ${endpoint.method} ${endpoint.path}...`));
      const result = await this.validateEndpoint(endpoint);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate multiple endpoints in parallel with configurable concurrency.
   * Faster than sequential validation for large API schemas.
   */
  async validateParallel(endpoints: APIEndpoint[], concurrency = 5): Promise<ContractResult[]> {
    const results: ContractResult[] = new Array(endpoints.length);
    let nextIndex = 0;

    const worker = async (workerId: number) => {
      while (nextIndex < endpoints.length) {
        const idx = nextIndex++;
        if (idx >= endpoints.length) break;
        const endpoint = endpoints[idx];
        console.log(chalk.gray(`  [worker-${workerId}] Testing ${endpoint.method} ${endpoint.path}...`));
        results[idx] = await this.validateEndpoint(endpoint);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, endpoints.length) }, (_, i) => worker(i));
    await Promise.all(workers);
    return results;
  }

  generateSummary(results: ContractResult[]): string {
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const total = results.length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / total || 0;

    return `
    Test Summary:
    ╭─────────────────────────────────────────────────────────────╮
    │  Total Tests: ${total.toString().padStart(3)}    │  Passed: ${chalk.green(passed.toString().padStart(3))}  │
    │  Failed:     ${failed.toString().padStart(3)}    │  Warnings: ${chalk.yellow(warnings.toString().padStart(3))} │
    │  Success Rate: ${successRate}%   │  Avg Response Time: ${avgResponseTime.toFixed(2)}ms │
    ╰─────────────────────────────────────────────────────────────╯
    `;
  }
}