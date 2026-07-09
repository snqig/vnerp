import { NextResponse } from 'next/server';
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
          description: "OpenAPI spec not found. Run 'pnpm docs:api' to generate.",
        },
        paths: {},
      },
      { status: 200 }
    );
  }
}
