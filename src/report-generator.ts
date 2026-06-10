import { TestReport, ContractResult } from './types';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';

export class ReportGenerator {
  private reportDir: string;

  constructor(reportDir?: string) {
    this.reportDir = reportDir || path.join(process.cwd(), 'reports');
    this.ensureReportDir();
  }

  private ensureReportDir(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  generateReport(report: TestReport): string {
    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `test-report-${timestamp}`;
    
    switch (report.summary.outputFormat || 'pretty') {
      case 'json':
        return this.generateJSONReport(report, filename);
      case 'yaml':
        return this.generateYAMLReport(report, filename);
      case 'markdown':
        return this.generateMarkdownReport(report, filename);
      case 'html':
        return this.generateHTMLReport(report, filename);
      case 'pretty':
      default:
        return this.generatePrettyReport(report);
    }
  }

  private generateJSONReport(report: TestReport, filename: string): string {
    const filePath = path.join(this.reportDir, `${filename}.json`);
    const content = JSON.stringify(report, null, 2);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  private generateYAMLReport(report: TestReport, filename: string): string {
    const filePath = path.join(this.reportDir, `${filename}.yaml`);
    const content = yaml.dump(report, { indent: 2 });
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  private generateHTMLReport(report: TestReport, filename: string): string {
    const filePath = path.join(this.reportDir, `${filename}.html`);
    const content = this.generateHTMLContent(report);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  private generateHTMLContent(report: TestReport): string {
    const { suite, timestamp, duration, totalTests, passed, failed, warnings, results, summary } = report;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Contract Test Report - ${suite}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            color: #333;
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 600;
        }
        .subtitle {
            color: #666;
            margin: 0;
            font-size: 14px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .summary-number {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
        }
        .summary-label {
            color: #666;
            font-size: 14px;
            margin: 5px 0 0 0;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .success-rate { color: #17a2b8; }
        .duration { color: #6c757d; }
        
        .results-section {
            margin-top: 30px;
        }
        .results-header {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
        }
        .result-item {
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .result-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .result-path {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
        }
        .result-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-pass {
            background: #d4edda;
            color: #155724;
        }
        .status-fail {
            background: #f8d7da;
            color: #721c24;
        }
        .status-warning {
            background: #fff3cd;
            color: #856404;
        }
        .result-details {
            padding: 15px;
        }
        .detail-section {
            margin-bottom: 15px;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
        }
        .detail-value {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: pre-wrap;
            border: 1px solid #e9ecef;
        }
        .differences {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 4px;
            padding: 10px;
        }
        .timestamp {
            color: #666;
            font-size: 14px;
        }
        .duration-info {
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">API Contract Test Report</h1>
            <p class="subtitle">Suite: ${suite} | ${timestamp.toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <p class="summary-number ${passed > 0 ? 'passed' : ''}">${passed}</p>
                <p class="summary-label">Passed</p>
            </div>
            <div class="summary-card">
                <p class="summary-number ${failed > 0 ? 'failed' : ''}">${failed}</p>
                <p class="summary-label">Failed</p>
            </div>
            <div class="summary-card">
                <p class="summary-number ${warnings > 0 ? 'warning' : ''}">${warnings}</p>
                <p class="summary-label">Warnings</p>
            </div>
            <div class="summary-card">
                <p class="summary-number total">${totalTests}</p>
                <p class="summary-label">Total Tests</p>
            </div>
            <div class="summary-card">
                <p class="summary-number success-rate">${summary.successRate}%</p>
                <p class="summary-label">Success Rate</p>
            </div>
            <div class="summary-card">
                <p class="summary-number duration">${summary.averageResponseTime}ms</p>
                <p class="summary-label">Avg Response Time</p>
            </div>
        </div>

        <div class="results-section">
            <h2 class="results-header">Test Results</h2>
            ${results.map(result => this.generateResultHTML(result)).join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateResultHTML(result: ContractResult): string {
    const statusClass = `status-${result.status}`;
    const statusText = result.status.toUpperCase();
    
    return `
    <div class="result-item">
        <div class="result-header">
            <span class="result-path">${result.endpoint}</span>
            <span class="result-status ${statusClass}">${statusText}</span>
        </div>
        <div class="result-details">
            <div class="detail-section">
                <div class="detail-label">Message</div>
                <div class="detail-value">${result.message}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Duration</div>
                <div class="detail-value">${result.duration}ms</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Timestamp</div>
                <div class="detail-value">${result.timestamp.toLocaleString()}</div>
            </div>
            ${result.details ? this.generateDetailsHTML(result.details) : ''}
        </div>
    </div>
    `;
  }

  private generateDetailsHTML(details: any): string {
    const sections = [];
    
    if (details.request) {
      sections.push(`
        <div class="detail-section">
            <div class="detail-label">Request</div>
            <div class="detail-value">${JSON.stringify(details.request, null, 2)}</div>
        </div>
      `);
    }
    
    if (details.response) {
      sections.push(`
        <div class="detail-section">
            <div class="detail-label">Response</div>
            <div class="detail-value">${JSON.stringify(details.response, null, 2)}</div>
        </div>
      `);
    }
    
    if (details.differences && details.differences.length > 0) {
      sections.push(`
        <div class="detail-section">
            <div class="detail-label">Differences</div>
            <div class="differences">
                ${details.differences.map((diff: string) => `<div>• ${diff}</div>`).join('')}
            </div>
        </div>
      `);
    }
    
    return sections.join('');
  }

  private generateMarkdownReport(report: TestReport, filename: string): string {
    const filePath = path.join(this.reportDir, `${filename}.md`);
    const { suite, timestamp, duration, totalTests, passed, failed, warnings, results, summary } = report;

    let md = `# API Contract Test Report\n\n`;
    md += `**Suite:** ${suite}  \n`;
    md += `**Date:** ${timestamp.toISOString()}  \n`;
    md += `**Duration:** ${duration}ms  \n\n`;

    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|---|---|\n`;
    md += `| Total Tests | ${totalTests} |\n`;
    md += `| Passed | ${passed} |\n`;
    md += `| Failed | ${failed} |\n`;
    md += `| Warnings | ${warnings} |\n`;
    md += `| Success Rate | ${summary.successRate}% |\n`;
    md += `| Avg Response Time | ${summary.averageResponseTime}ms |\n\n`;

    md += `## Results\n\n`;
    md += `| Endpoint | Method | Status | Duration | Message |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const result of results) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      md += `| ${result.endpoint} | ${result.method} | ${icon} ${result.status} | ${result.duration}ms | ${result.message} |\n`;
    }

    // Detail failures and warnings
    const issues = results.filter(r => r.status !== 'pass');
    if (issues.length > 0) {
      md += `\n## Issues\n\n`;
      for (const issue of issues) {
        const icon = issue.status === 'fail' ? '❌' : '⚠️';
        md += `### ${icon} ${issue.method} ${issue.endpoint}\n\n`;
        md += `**Status:** ${issue.status} | **Duration:** ${issue.duration}ms\n\n`;
        md += `${issue.message}\n\n`;
        if (issue.details?.differences?.length) {
          md += `Differences:\n`;
          for (const diff of issue.details.differences) {
            md += `- ${diff}\n`;
          }
          md += `\n`;
        }
      }
    }

    fs.writeFileSync(filePath, md);
    return filePath;
  }

  private generatePrettyReport(report: TestReport): string {
    const { suite, timestamp, duration, totalTests, passed, failed, warnings, results, summary } = report;
    
    let output = `
📋 API Contract Test Report
=========================
Suite: ${suite}
Timestamp: ${timestamp.toLocaleString()}
Duration: ${duration}ms
Total Tests: ${totalTests}
Passed: ${chalk.green(passed)}
Failed: ${chalk.red(failed)}
Warnings: ${chalk.yellow(warnings)}
Success Rate: ${summary.successRate}%
Average Response Time: ${summary.averageResponseTime}ms

`;

    results.forEach(result => {
      const statusColor = result.status === 'pass' ? chalk.green : 
                         result.status === 'fail' ? chalk.red : chalk.yellow;
      const statusIcon = result.status === 'pass' ? '✅' : 
                        result.status === 'fail' ? '❌' : '⚠️';
      
      output += `
${statusIcon} ${statusColor(result.method)} ${result.endpoint}
   ${chalk.gray(result.message)}
   Duration: ${result.duration}ms
   Time: ${result.timestamp.toLocaleString()}
`;
      
      if (result.details?.differences) {
        output += `   Differences:\n`;
        result.details.differences.forEach((diff: string) => {
          output += `     ${chalk.yellow('•')} ${diff}\n`;
        });
      }
    });

    return output;
  }
}