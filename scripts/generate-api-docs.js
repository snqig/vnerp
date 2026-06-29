#!/usr/bin/env node
/**
 * API 文档生成器
 * 扫描所有 API 路由并生成文档
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const API_DIR = path.join(PROJECT_ROOT, 'src', 'app', 'api');

// API 文档
const apiDocs = [];

// 扫描 API 路由
function scanApiRoutes() {
  function scan(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        scan(fullPath, basePath ? `${basePath}/${item.name}` : item.name);
      } else if (item.name === 'route.ts') {
        analyzeApiRoute(fullPath, basePath);
      }
    }
  }
  
  scan(API_DIR);
}

// 分析 API 路由
function analyzeApiRoute(filePath, routePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 提取 HTTP 方法
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  
  // 提取参数
  const params = [];
  const paramMatches = content.matchAll(/params:\s*\{[^}]+\}/g);
  for (const match of paramMatches) {
    params.push(match[0]);
  }
  
  // 提取描述（从注释中）
  let description = '';
  const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (commentMatch) {
    description = commentMatch[1]
      .replace(/\*/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }
  
  apiDocs.push({
    path: `/api/${routePath}`,
    methods,
    params: params.length > 0 ? params : undefined,
    description: description || 'No description',
    file: path.relative(PROJECT_ROOT, filePath),
    lineCount: lines.length,
  });
}

// 生成 Markdown 文档
function generateMarkdown() {
  let md = `# API Documentation

Generated: ${new Date().toISOString()}

## Overview

Total API Routes: ${apiDocs.length}

## API Endpoints

`;

  // 按路径分组
  const grouped = {};
  for (const api of apiDocs) {
    const module = api.path.split('/')[2] || 'root';
    if (!grouped[module]) grouped[module] = [];
    grouped[module].push(api);
  }

  for (const [module, apis] of Object.entries(grouped).sort()) {
    md += `### ${module.charAt(0).toUpperCase() + module.slice(1)} Module\n\n`;
    
    for (const api of apis) {
      md += `#### \`${api.path}\`\n\n`;
      md += `**Methods:** ${api.methods.join(', ')}\n\n`;
      md += `**Description:** ${api.description}\n\n`;
      
      if (api.params) {
        md += `**Parameters:**\n\`\`\`typescript\n${api.params.join('\n')}\n\`\`\`\n\n`;
      }
      
      md += `**File:** \`${api.file}\`\n\n`;
      md += '---\n\n';
    }
  }

  return md;
}

// 生成 OpenAPI 规范
function generateOpenAPI() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'VNERP API',
      version: '1.0.0',
      description: 'ERP System API for Printing Industry',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    paths: {},
  };

  for (const api of apiDocs) {
    const pathItem = {};
    
    for (const method of api.methods) {
      pathItem[method.toLowerCase()] = {
        summary: api.description,
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          500: { description: 'Server Error' },
        },
      };
    }
    
    spec.paths[api.path] = pathItem;
  }

  return JSON.stringify(spec, null, 2);
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('API Documentation Generator');
  console.log('='.repeat(80));
  
  scanApiRoutes();
  
  console.log(`\nFound ${apiDocs.length} API routes\n`);
  
  // 生成 Markdown 文档
  const md = generateMarkdown();
  fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', 'API.md'), md);
  console.log('Generated: docs/API.md');
  
  // 生成 OpenAPI 规范
  const openapi = generateOpenAPI();
  fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', 'openapi.json'), openapi);
  console.log('Generated: docs/openapi.json');
  
  // 输出摘要
  console.log('\n' + '='.repeat(80));
  console.log('API Summary');
  console.log('='.repeat(80));
  
  const byMethod = {};
  for (const api of apiDocs) {
    for (const method of api.methods) {
      byMethod[method] = (byMethod[method] || 0) + 1;
    }
  }
  
  console.log('\nBy Method:');
  for (const [method, count] of Object.entries(byMethod).sort()) {
    console.log(`  ${method}: ${count}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Documentation generated successfully!');
  console.log('='.repeat(80));
}

main();
