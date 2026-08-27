#!/usr/bin/env node
/**
 * Swagger UI 集成补全脚本
 *
 * 功能：
 * 1. 安装 swagger-ui-react 依赖
 * 2. 创建 /api-docs 页面（Swagger UI 在线调试）
 * 3. 创建 /api/openapi.json API 路由（动态返回 OpenAPI 规范）
 * 4. 更新 generate-api-docs.js 输出路径（docs/ → docs/10-接口文档/）
 * 5. 在 package.json 新增 scripts: docs:api（生成 API 文档）
 *
 * 使用方式：
 *   node scripts/setup-swagger-ui.cjs          # 预览将要创建的文件
 *   node scripts/setup-swagger-ui.cjs --apply  # 实际执行
 *
 * 前置条件：
 *   - 项目已生成 docs/10-接口文档/openapi.json（pnpm docs:api）
 *   - Next.js 16 + App Router
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

if (!APPLY) {
  console.log('[DRY RUN] 预览模式 — 加 --apply 参数实际执行\n');
}

// ==========================================
// 1. 检查/安装 swagger-ui-react
// ==========================================

const PKG_PATH = path.join(PROJECT_ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

const SWAGGER_DEP = 'swagger-ui-react';
const SWAGGER_VERSION = '^5.18.2';

const hasSwagger = pkg.dependencies?.[SWAGGER_DEP];

if (hasSwagger) {
  console.log(`[SKIP] ${SWAGGER_DEP} 已安装 (${hasSwagger})`);
} else {
  console.log(`[INSTALL] 需要安装 ${SWAGGER_DEP}@${SWAGGER_VERSION}`);
  console.log(`  执行: pnpm add ${SWAGGER_DEP}@${SWAGGER_VERSION}`);
  if (APPLY) {
    const { execSync } = require('child_process');
    try {
      execSync(`pnpm add ${SWAGGER_DEP}@${SWAGGER_VERSION}`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
      console.log('[OK] 安装成功');
    } catch (e) {
      console.error('[FAIL] 安装失败，请手动执行: pnpm add', SWAGGER_DEP);
      process.exit(1);
    }
  }
}

// ==========================================
// 2. 创建 /api-docs 页面
// ==========================================

const API_DOCS_PAGE = `'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Swagger UI 依赖浏览器 API，必须 ssr: false
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading API Docs...</p>,
});

import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/openapi.json')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Failed to load OpenAPI spec:', err));
  }, []);

  if (!spec) {
    return (
      <div style={{ padding: 24 }}>
        <h1>API Documentation</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff' }}>
      <SwaggerUI spec={spec} docExpansion="list" filter={true} />
    </div>
  );
}
`;

const API_DOCS_PAGE_PATH = path.join(PROJECT_ROOT, 'src', 'app', '[locale]', 'api-docs', 'page.tsx');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (APPLY) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[CREATE] ${path.relative(PROJECT_ROOT, filePath)}`);
  } else {
    console.log(`[CREATE] ${path.relative(PROJECT_ROOT, filePath)} (dry run)`);
  }
}

writeFile(API_DOCS_PAGE_PATH, API_DOCS_PAGE);

// ==========================================
// 3. 创建 /api/openapi.json 路由
// ==========================================

const OPENAPI_ROUTE = `import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 动态返回 OpenAPI 3.0 规范
 *
 * 数据源：docs/10-接口文档/openapi.json
 * 由 scripts/generate-api-docs.js 生成
 * 可通过 pnpm docs:api 重新生成
 */
export async function GET() {
  const specPath = path.join(process.cwd(), 'docs', '10-接口文档', 'openapi.json');

  try {
    const spec = fs.readFileSync(specPath, 'utf8');
    return NextResponse.json(JSON.parse(spec), {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      {
        openapi: '3.0.0',
        info: {
          title: 'Print MIS API',
          version: '0.0.0',
          description: 'OpenAPI spec not found. Run \\'pnpm docs:api\\' to generate.',
        },
        paths: {},
      },
      { status: 200 }
    );
  }
}
`;

const OPENAPI_ROUTE_PATH = path.join(PROJECT_ROOT, 'src', 'app', 'api', 'openapi.json', 'route.ts');

writeFile(OPENAPI_ROUTE_PATH, OPENAPI_ROUTE);

// ==========================================
// 4. 更新 generate-api-docs.js 输出路径
// ==========================================

const GEN_SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'generate-api-docs.js');

if (fs.existsSync(GEN_SCRIPT_PATH)) {
  let genContent = fs.readFileSync(GEN_SCRIPT_PATH, 'utf8');
  const oldPath1 = "fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', 'API.md'), md);";
  const newPath1 = "fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', '10-接口文档', 'API.md'), md);";
  const oldPath2 = "fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', 'openapi.json'), openapi);";
  const newPath2 = "fs.writeFileSync(path.join(PROJECT_ROOT, 'docs', '10-接口文档', 'openapi.json'), openapi);";

  if (genContent.includes(oldPath1)) {
    genContent = genContent.replace(oldPath1, newPath1);
    console.log('[UPDATE] generate-api-docs.js: API.md 路径 → docs/10-接口文档/');
  }
  if (genContent.includes(oldPath2)) {
    genContent = genContent.replace(oldPath2, newPath2);
    console.log('[UPDATE] generate-api-docs.js: openapi.json 路径 → docs/10-接口文档/');
  }

  // 同时更新 console.log 输出路径
  genContent = genContent.replace(
    "console.log('Generated: docs/API.md');",
    "console.log('Generated: docs/10-接口文档/API.md');"
  );
  genContent = genContent.replace(
    "console.log('Generated: docs/openapi.json');",
    "console.log('Generated: docs/10-接口文档/openapi.json');"
  );

  if (APPLY) {
    fs.writeFileSync(GEN_SCRIPT_PATH, genContent, 'utf8');
  }
} else {
  console.log('[WARN] scripts/generate-api-docs.js 不存在，跳过路径更新');
}

// ==========================================
// 5. 在 package.json 新增 scripts
// ==========================================

const NEW_SCRIPTS = {
  'docs:api': 'node scripts/generate-api-docs.js',
};

let scriptsUpdated = false;
if (!pkg.scripts['docs:api']) {
  pkg.scripts['docs:api'] = NEW_SCRIPTS['docs:api'];
  scriptsUpdated = true;
  console.log('[UPDATE] package.json: 新增 scripts.docs:api');
}

if (scriptsUpdated && APPLY) {
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// ==========================================
// 6. 生成 .gitignore 排除项（swagger-ui-react 已在 dependencies，无需特殊处理）
// ==========================================

// ==========================================
// 汇总
// ==========================================

console.log('\n' + '='.repeat(60));
if (APPLY) {
  console.log('Swagger UI 集成完成！');
} else {
  console.log('Swagger UI 集成预览（dry run）');
}
console.log('='.repeat(60));
console.log(`
已创建/更新的文件：
  1. src/app/[locale]/api-docs/page.tsx        — Swagger UI 页面
  2. src/app/api/openapi.json/route.ts          — OpenAPI spec API 路由
  3. scripts/generate-api-docs.js               — 输出路径修正
  4. package.json                               — 新增 docs:api 脚本

后续步骤：
  1. 安装依赖：pnpm add swagger-ui-react@^5.18.2
     ${hasSwagger ? '(已安装)' : '(未安装，上面已自动执行或手动执行)'}
  2. 重新生成 API 文档：pnpm docs:api
  3. 启动开发服务器：pnpm dev
  4. 访问 http://localhost:5000/zh-CN/api-docs 查看 Swagger UI
  5. （可选）在导航菜单中添加 "API 文档" 入口

注意事项：
  - Swagger UI 页面为 'use client' 组件，通过 dynamic import + ssr:false 加载
  - openapi.json 路由设了 1 小时缓存，重新生成后需重启或等待缓存过期
  - 生产环境建议将 API 文档页面放在权限中间件之后（仅开发/运维可访问）
`);
