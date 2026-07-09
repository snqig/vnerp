import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

export async function POST() {
  try {
    const content = `# 排除 . 开头的文件和目录
.*

# 但保留以下文件（取消注释以启用）
# !.gitignore
# !.env.example
# !.eslintrc.js
# !.prettierrc.js

# 依赖目录
node_modules/
__pycache__/
.pytest_cache/

# 构建输出
.next/
out/
build/
dist/

# 环境变量
.env
.env.local
.env.*.local

# 日志
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 编辑器
.vscode/
.idea/
*.swp
*.swo

# 操作系统
.DS_Store
Thumbs.db

# 临时文件
*.tmp
*.temp
.cache/
`;

    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
    fs.writeFileSync(gitignorePath, content, 'utf8');

    return NextResponse.json({
      success: true,
      message: `已生成 .gitignore 文件: ${gitignorePath}`,
    });
  } catch {
    return NextResponse.json({ success: false, message: '生成 .gitignore 失败' }, { status: 500 });
  }
}
