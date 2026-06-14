import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { TestConfig, APISchema, TestSuite } from './types';

export class ConfigManager {
  private configPath: string;
  private configDir: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.configDir = path.dirname(this.configPath);
  }

  private getDefaultConfigPath(): string {
    return process.env.ACT_CONFIG_PATH || 
           path.join(process.cwd(), 'act.config.json');
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  private mergeConfig(defaultConfig: any, userConfig: any): any {
    return {
      ...defaultConfig,
      ...userConfig,
      ...(userConfig.headers ? { headers: { ...defaultConfig.headers, ...userConfig.headers } } : {}),
    };
  }

  private getDefaultConfig(): TestConfig {
    return {
      baseUrl: 'http://localhost:3000',
      timeout: 10000,
      retries: 3,
      parallel: false,
      verbose: false,
      outputFormat: 'pretty',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'api-contract-tester/1.0.0',
      },
    };
  }

  loadConfig(): TestConfig {
    try {
      this.ensureConfigDir();
      
      const defaultConfig = this.getDefaultConfig();
      
      if (fs.existsSync(this.configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return this.mergeConfig(defaultConfig, userConfig);
      }
      
      this.saveConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      console.error('Error loading config:', error);
      return this.getDefaultConfig();
    }
  }

  saveConfig(config: TestConfig): void {
    try {
      this.ensureConfigDir();
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  loadSchema(schemaPath: string): APISchema {
    try {
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const ext = path.extname(schemaPath).toLowerCase();

      switch (ext) {
        case '.json':
          return JSON.parse(schemaContent);
        case '.yaml':
        case '.yml':
          return yaml.load(schemaContent) as APISchema;
        default:
          throw new Error(`Unsupported schema format: ${ext}`);
      }
    } catch (error) {
      console.error('Error loading schema:', error);
      throw error;
    }
  }

  loadTestSuite(suitePath: string): TestSuite {
    try {
      if (!fs.existsSync(suitePath)) {
        throw new Error(`Test suite file not found: ${suitePath}`);
      }

      const suiteContent = fs.readFileSync(suitePath, 'utf8');
      const ext = path.extname(suitePath).toLowerCase();

      switch (ext) {
        case '.json':
          return JSON.parse(suiteContent);
        case '.yaml':
        case '.yml':
          return yaml.load(suiteContent) as TestSuite;
        default:
          throw new Error(`Unsupported test suite format: ${ext}`);
      }
    } catch (error) {
      console.error('Error loading test suite:', error);
      throw error;
    }
  }

  generateSchemaTemplate(schemaPath: string): void {
    this.ensureConfigDir();
    
    const template: APISchema = {
      baseUrl: 'http://localhost:3000',
      version: '1.0.0',
      endpoints: [
        {
          path: '/api/users',
          method: 'GET',
          response: {
            status: 200,
            schema: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' }
                    },
                    required: ['id', 'name', 'email']
                  }
                }
              }
            }
          }
        }
      ],
      security: {
        type: 'Bearer'
      }
    };

    const ext = path.extname(schemaPath).toLowerCase();
    const content = ext === '.yaml' ? yaml.dump(template, { indent: 2 }) : JSON.stringify(template, null, 2);
    
    fs.writeFileSync(schemaPath, content);
  }

  generateConfigTemplate(configPath: string): void {
    this.ensureConfigDir();
    const config = this.getDefaultConfig();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  validateConfig(config: TestConfig): string[] {
    const errors: string[] = [];

    if (!config.baseUrl) {
      errors.push('baseUrl is required');
    } else if (!config.baseUrl.startsWith('http://') && !config.baseUrl.startsWith('https://')) {
      errors.push('baseUrl must start with http:// or https://');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('timeout must be between 1000 and 300000 milliseconds');
    }

    if (config.retries && (config.retries < 0 || config.retries > 10)) {
      errors.push('retries must be between 0 and 10');
    }

    if (config.outputFormat && !['json', 'yaml', 'html', 'pretty'].includes(config.outputFormat)) {
      errors.push('outputFormat must be one of: json, yaml, html, pretty');
    }

    return errors;
  }
}