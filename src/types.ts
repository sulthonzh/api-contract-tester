export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  parameters?: {
    query?: Record<string, any>;
    path?: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
    schema?: any;
  };
}

export interface APISchema {
  baseUrl: string;
  version: string;
  endpoints: APIEndpoint[];
  security?: {
    type: string;
    scheme?: any;
  };
}

export interface ContractResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: {
    request?: any;
    response?: any;
    expected?: any;
    actual?: any;
    differences?: string[];
  };
  timestamp: Date;
  duration: number;
}

export interface TestSuite {
  name: string;
  description: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  preconditions?: {
    headers?: Record<string, string>;
    authentication?: string;
  };
  postConditions?: {
    cleanup?: () => Promise<void>;
  };
}

export interface TestReport {
  suite: string;
  timestamp: Date;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ContractResult[];
  summary: {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    outputFormat?: string;
  };
}

export interface TestConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  parallel?: boolean;
  verbose?: boolean;
  outputFormat?: 'json' | 'yaml' | 'html' | 'pretty';
}