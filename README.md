# API Contract Tester

Comprehensive CLI tool for testing API contracts between frontend and backend systems. Validate endpoints, check responses, and generate detailed reports.

## 🚀 Features

- **Multi-format Support**: JSON and YAML schemas
- **Endpoint Validation**: Test individual endpoints or entire APIs
- **Response Schema Validation**: JSON schema validation for responses
- **Multiple Output Formats**: Pretty console, JSON, YAML, and HTML reports
- **Interactive Mode**: Guided setup and testing
- **Parallel Testing**: Run tests in parallel for better performance
- **Retry Logic**: Configurable retry attempts for flaky endpoints
- **Header Validation**: Validate response headers
- **Custom Configuration**: Override settings via CLI or config files
- **Detailed Reports**: Comprehensive test reports with differences and metrics

## 📦 Installation

```bash
# Install globally
npm install -g api-contract-tester

# Or use npx
npx api-contract-tester --help
```

## 🛠️ Usage

### Quick Start

```bash
# Run a quick test on your API
act test

# Test with a schema file
act test -s ./api-schema.json

# Test with custom options
act test -u https://api.example.com -o json -v -p
```

### Configuration

Initialize configuration:

```bash
act config --init
```

Show current configuration:

```bash
act config --show
```

### Schema Management

Generate schema template:

```bash
act schema --generate ./schema.json
```

Validate schema file:

```bash
act schema --validate ./schema.json
```

## 🔧 Configuration

### Config File (`act.config.json`)

```json
{
  "baseUrl": "https://api.example.com",
  "timeout": 10000,
  "retries": 3,
  "parallel": false,
  "verbose": false,
  "outputFormat": "pretty",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123"
  }
}
```

### API Schema Format

```json
{
  "baseUrl": "https://api.example.com",
  "version": "1.0.0",
  "endpoints": [
    {
      "path": "/api/users",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer token123"
      },
      "parameters": {
        "query": {
          "page": 1,
          "limit": 10
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "schema": {
          "type": "object",
          "properties": {
            "users": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "name": { "type": "string" },
                  "email": { "type": "string" }
                },
                "required": ["id", "name", "email"]
              }
            }
          }
        }
      }
    }
  ],
  "security": {
    "type": "Bearer"
  }
}
```

### Test Suite Format

```json
{
  "name": "User API Tests",
  "description": "Comprehensive user API testing suite",
  "baseUrl": "https://api.example.com",
  "preconditions": {
    "headers": {
      "Authorization": "Bearer token123"
    }
  },
  "endpoints": [
    {
      "path": "/api/users",
      "method": "GET",
      "response": {
        "status": 200
      }
    }
  ]
}
```

## 📊 CLI Commands

### Test Commands

```bash
# Basic test
act test

# With schema file
act test -s ./schema.json

# With test suite
act test -t ./suite.json

# Override base URL
act test -u https://api.example.com

# Output formats
act test -o json          # JSON output
act test -o yaml          # YAML output
act test -o html          # HTML report
act test -o pretty        # Pretty console (default)

# Advanced options
act test -v               # Verbose output
act test -p               # Parallel execution
act test --timeout 5000   # 5 second timeout
act test --retries 5      # 5 retry attempts
```

### Configuration Management

```bash
act config --init         # Initialize config
act config --show         # Show current config
act config --edit         # Edit config file
```

### Schema Management

```bash
act schema --generate ./schema.json  # Generate schema template
act schema --validate ./schema.json  # Validate schema file
```

## 📈 Output Examples

### Pretty Console Output

```
📋 API Contract Test Report
=========================
Suite: API Schema Tests
Timestamp: 2023-01-01T10:00:00.000Z
Duration: 2500ms
Total Tests: 5
Passed: 3
Failed: 1
Warnings: 1
Success Rate: 60%
Average Response Time: 450ms

✅ GET /api/users
   Endpoint response matches expected schema
   Duration: 200ms
   Time: 2023-01-01T10:00:00.100Z

❌ POST /api/users
   Status code mismatch: expected 201, got 400
   Duration: 1500ms
   Time: 2023-01-01T10:00:01.200Z
   Differences:
     • Status code: expected 201, got 400

⚠️ GET /api/posts
   Endpoint response matches expected schema (Header mismatches: 1 found)
   Duration: 150ms
   Time: 2023-01-01T10:00:01.350Z
```

### JSON Report

```json
{
  "suite": "API Schema Tests",
  "timestamp": "2023-01-01T10:00:00.000Z",
  "duration": 2500,
  "totalTests": 5,
  "passed": 3,
  "failed": 1,
  "warnings": 1,
  "results": [
    {
      "endpoint": "GET /api/users",
      "method": "GET",
      "status": "pass",
      "message": "Endpoint response matches expected schema",
      "details": {
        "request": { "method": "GET", "url": "/api/users" },
        "response": { "status": 200, "data": { "users": [] } }
      },
      "timestamp": "2023-01-01T10:00:00.100Z",
      "duration": 200
    }
  ],
  "summary": {
    "successRate": 60,
    "averageResponseTime": 450,
    "errorRate": 20
  }
}
```

## 🔍 Advanced Features

### Parallel Testing

Run multiple endpoint tests in parallel for better performance:

```bash
act test -p -s ./large-schema.json
```

### Custom Headers

Add custom headers to all requests:

```json
{
  "headers": {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  }
}
```

### Query Parameters

Test endpoints with query parameters:

```json
{
  "path": "/api/search",
  "method": "GET",
  "parameters": {
    "query": {
      "q": "test",
      "limit": 10,
      "offset": 0
    }
  }
}
```

### Request Bodies

Test POST/PUT/PATCH with request bodies:

```json
{
  "path": "/api/users",
  "method": "POST",
  "parameters": {
    "body": {
      "name": "John Doe",
      "email": "john@example.com",
      "active": true
    }
  },
  "response": {
    "status": 201,
    "schema": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["id", "name", "email"]
    }
  }
}
```

## 🧪 Development

### Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd api-contract-tester

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
api-contract-tester/
├── src/
│   ├── index.ts          # Main entry point
│   ├── cli.ts            # CLI interface
│   ├── contract-validator.ts  # Core validation logic
│   ├── config-manager.ts     # Configuration management
│   ├── report-generator.ts   # Report generation
│   └── types.ts         # TypeScript type definitions
├── tests/
│   ├── contract-validator.test.ts
│   ├── config-manager.test.ts
│   ├── cli.test.ts
│   └── report-generator.test.ts
├── examples/            # Example schemas and configurations
└── dist/                # Compiled output
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Tools

- [API Documentation Generator](https://github.com/sulthonzh/api-docs-generator)
- [API Performance Monitor](https://github.com/sulthonzh/api-performance-monitor)
- [API Security Scanner](https://github.com/sulthonzh/api-security-scanner)

## 🙏 Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js) for CLI interface
- Uses [Ajv](https://github.com/ajv-validator/ajv) for JSON schema validation
- Styled with [Chalk](https://github.com/chalk/chalk) for terminal colors
- Uses [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) for interactive prompts