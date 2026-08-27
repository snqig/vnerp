#!/usr/bin/env node
/**
 * 项目上传工具
 * - 排除 . 开头的文件和目录
 * - 提供交互式 UI 选择文件
 * - 支持上传到 GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(colors[color] || '', ...args, colors.reset);
}

// 项目根目录
const PROJECT_ROOT = process.cwd();

/**
 * 判断是否应该排除
 */
function shouldExclude(name) {
  // 排除 . 开头的文件和目录
  if (name.startsWith('.')) return true;

  // 排除特定目录
  const excludedDirs = ['node_modules', '__pycache__', '.git', '.next'];
  if (excludedDirs.includes(name)) return true;

  return false;
}

/**
 * 获取所有文件（排除 . 开头的）
 */
function getAllFiles(dir, fileList = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (shouldExclude(item.name)) continue;

      if (item.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }

  return fileList;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  for (const unit of units) {
    if (size < 1024) return `${size.toFixed(1)} ${unit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}

/**
 * 获取文件信息
 */
function getFileInfo(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    return {
      path: relativePath,
      size: stat.size,
      modified: stat.mtime.toISOString().replace('T', ' ').substring(0, 19),
    };
  } catch {
    return null;
  }
}

/**
 * 生成 .gitignore 文件
 */
function generateGitignore() {
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
  log('green', `✓ 已生成 .gitignore 文件: ${gitignorePath}`);
}

/**
 * 创建 GitHub 仓库
 */
function createGitHubRepo(repoName, description, isPrivate) {
  try {
    const cmd = [
      'gh', 'repo', 'create', repoName,
      '--description', description || '',
      isPrivate ? '--private' : '--public',
    ];

    const result = execSync(cmd.join(' '), { encoding: 'utf8' });
    log('green', `✓ 仓库创建成功:\n${result}`);
    return true;
  } catch (error) {
    log('red', `✗ 创建仓库失败: ${error.message}`);
    return false;
  }
}

/**
 * 上传到 GitHub
 */
function uploadToGitHub(repoName, commitMsg, selectedFiles) {
  try {
    // 初始化 git（如果需要）
    const gitDir = path.join(PROJECT_ROOT, '.git');
    if (!fs.existsSync(gitDir)) {
      execSync('git init', { cwd: PROJECT_ROOT });
      log('cyan', '✓ 已初始化 Git 仓库');
    }

    // 添加所有文件（git 会自动处理 .gitignore）
    execSync('git add .', { cwd: PROJECT_ROOT });
    log('cyan', `✓ 已添加文件`);

    // 提交
    execSync(`git commit -m "${commitMsg}"`, { cwd: PROJECT_ROOT });
    log('cyan', '✓ 已提交');

    // 检查远程仓库
    let remoteUrl;
    try {
      remoteUrl = execSync('git remote get-url origin', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
    } catch {
      // 获取用户名
      let username = 'your-username';
      try {
        username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      } catch {}

      execSync(`git remote add origin https://github.com/${username}/${repoName}.git`, { cwd: PROJECT_ROOT });
      log('cyan', '✓ 已添加远程仓库');
    }

    // 推送
    execSync('git push -u origin main', { cwd: PROJECT_ROOT });
    log('green', '✓ 上传完成');

    return true;
  } catch (error) {
    log('red', `✗ 上传失败: ${error.message}`);
    return false;
  }
}

/**
 * 交互式命令行界面
 */
async function interactiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  log('cyan', '\n========================================');
  log('cyan', '       项目上传工具');
  log('cyan', '========================================\n');
  log('yellow', `项目根目录: ${PROJECT_ROOT}\n`);

  // 获取所有文件
  log('yellow', '正在扫描文件...');
  const files = getAllFiles(PROJECT_ROOT);
  const fileInfos = files.map(getFileInfo).filter(Boolean);

  // 统计
  const totalSize = fileInfos.reduce((sum, f) => sum + f.size, 0);
  log('green', `✓ 找到 ${files.length} 个文件，总大小: ${formatSize(totalSize)}`);
  log('yellow', '（已排除 . 开头的文件和目录）\n');

  // 显示文件列表（前 20 个）
  log('cyan', '文件列表（前 20 个）:');
  fileInfos.slice(0, 20).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.path} (${formatSize(f.size)})`);
  });
  if (files.length > 20) {
    log('yellow', `  ... 还有 ${files.length - 20} 个文件`);
  }
  console.log('');

  // 选择操作
  log('cyan', '请选择操作:');
  log('cyan', '  1. 生成 .gitignore 文件');
  log('cyan', '  2. 创建 GitHub 仓库');
  log('cyan', '  3. 上传到 GitHub');
  log('cyan', '  4. 全部执行（生成 .gitignore + 创建仓库 + 上传）');
  log('cyan', '  5. 导出文件列表');
  log('cyan', '  6. 退出');

  const choice = await question('\n请输入选项 (1-6): ');

  switch (choice.trim()) {
    case '1':
      generateGitignore();
      break;

    case '2':
      const repoName = await question('仓库名称 (默认: erp-project): ') || 'erp-project';
      const repoDesc = await question('仓库描述 (默认: ERP 项目管理系统): ') || 'ERP 项目管理系统';
      const isPrivate = (await question('私有仓库? (y/N): ')).toLowerCase() === 'y';
      createGitHubRepo(repoName, repoDesc, isPrivate);
      break;

    case '3':
      const uploadRepo = await question('仓库名称 (默认: erp-project): ') || 'erp-project';
      const commitMsg = await question('提交信息 (默认: Initial commit): ') || 'Initial commit';
      uploadToGitHub(uploadRepo, commitMsg, files);
      break;

    case '4':
      const fullRepoName = await question('仓库名称 (默认: erp-project): ') || 'erp-project';
      const fullRepoDesc = await question('仓库描述 (默认: ERP 项目管理系统): ') || 'ERP 项目管理系统';
      const fullIsPrivate = (await question('私有仓库? (y/N): ')).toLowerCase() === 'y';
      const fullCommitMsg = await question('提交信息 (默认: Initial commit): ') || 'Initial commit';

      generateGitignore();
      if (createGitHubRepo(fullRepoName, fullRepoDesc, fullIsPrivate)) {
        uploadToGitHub(fullRepoName, fullCommitMsg, files);
      }
      break;

    case '5':
      exportFileList();
      break;

    case '6':
      log('yellow', '再见！');
      break;

    default:
      log('red', '无效选项');
  }

  rl.close();
}

/**
 * 导出文件列表到 JSON
 */
function exportFileList() {
  const files = getAllFiles(PROJECT_ROOT);
  const fileInfos = files.map(getFileInfo).filter(Boolean);

  const outputPath = path.join(PROJECT_ROOT, 'scripts', 'file-list.json');
  fs.writeFileSync(outputPath, JSON.stringify(fileInfos, null, 2), 'utf8');

  log('green', `✓ 已导出文件列表到: ${outputPath}`);
  log('cyan', `  共 ${files.length} 个文件`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--export')) {
    exportFileList();
    return;
  }

  if (args.includes('--gitignore')) {
    generateGitignore();
    return;
  }

  if (args.includes('--help')) {
    log('cyan', '\n项目上传工具');
    log('cyan', '\n用法:');
    log('cyan', '  node project_uploader.js           启动交互式界面');
    log('cyan', '  node project_uploader.js --export  导出文件列表');
    log('cyan', '  node project_uploader.js --gitignore  生成 .gitignore');
    log('cyan', '  node project_uploader.js --help    显示帮助');
    return;
  }

  await interactiveCLI();
}

main().catch(console.error);
