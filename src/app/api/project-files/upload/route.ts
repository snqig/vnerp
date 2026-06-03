import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoName, repoDesc, isPrivate, commitMsg, files } = body;

    // 1. 初始化 git（如果需要）
    const gitDir = path.join(PROJECT_ROOT, '.git');
    if (!fs.existsSync(gitDir)) {
      execSync('git init', { cwd: PROJECT_ROOT });
    }

    // 2. 添加所有文件（git 会自动处理 .gitignore）
    execSync('git add .', { cwd: PROJECT_ROOT });

    // 3. 提交
    execSync(`git commit -m "${commitMsg || 'Initial commit'}"`, { cwd: PROJECT_ROOT });

    // 4. 检查远程仓库
    try {
      execSync('git remote get-url origin', { cwd: PROJECT_ROOT });
    } catch {
      // 获取用户名
      let username = 'your-username';
      try {
        username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      } catch {}

      execSync(
        `git remote add origin https://github.com/${username}/${repoName}.git`,
        { cwd: PROJECT_ROOT }
      );
    }

    // 5. 推送
    execSync('git push -u origin main', { cwd: PROJECT_ROOT });

    return NextResponse.json({
      success: true,
      message: `已上传 ${files?.length || 0} 个文件到 ${repoName}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: `上传失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
