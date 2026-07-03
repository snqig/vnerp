#!/usr/bin/env node
/**
 * 项目一键初始化脚本
 *
 * 功能：
 * 1. 检测并安装依赖（pnpm install）
 * 2. 检测并创建数据库（如不存在）
 * 3. 执行建表 SQL
 * 4. 导入种子数据（可选）
 * 5. 执行数据库迁移
 * 6. 初始化系统配置
 * 7. 输出下一步操作指引
 *
 * 用法：
 *   node scripts/init-project.js              # 基础初始化（建表）
 *   node scripts/init-project.js --seed       # 初始化 + 种子数据
 *   node scripts/init-project.js --demo       # 初始化 + Demo 数据
 *   node scripts/init-project.js --full       # 完整初始化（表 + 种子 + Demo + 菜单）
 *   node scripts/init-project.js --skip-deps  # 跳过依赖安装
 *   node scripts/init-project.js --env        # 生成 .env 配置文件（交互式）
 *
 * 前置条件：
 *   - Node.js >= 18
 *   - pnpm >= 8
 *   - MySQL >= 8.0
 *   - 已配置 .env 或使用 --env 生成
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const options = {
  seed: args.includes('--seed'),
  demo: args.includes('--demo'),
  full: args.includes('--full'),
  skipDeps: args.includes('--skip-deps'),
  env: args.includes('--env'),
  help: args.includes('--help') || args.includes('-h'),
};

const steps = [];
let currentStep = 0;

function logStep(title) {
  currentStep++;
  steps.push(title);
  console.log(`\n${'='.repeat(60)}`);
  console.log(` 步骤 ${currentStep}: ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
}

function logError(msg) {
  console.error(`❌ ${msg}`);
}

function logWarn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
  return true;
}

async function checkDependencies() {
  logStep('检查 Node.js 和 pnpm');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    throw new Error(`Node.js 版本过低：${nodeVersion}，需要 >= 18`);
  }
  logSuccess(`Node.js 版本: ${nodeVersion}`);

  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    logSuccess(`pnpm 版本: ${pnpmVersion}`);
  } catch {
    throw new Error('未检测到 pnpm，请先安装：npm install -g pnpm');
  }
}

async function installDependencies() {
  if (options.skipDeps) {
    logWarn('跳过依赖安装（--skip-deps）');
    return;
  }

  logStep('安装项目依赖');

  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    logInfo('检测到 node_modules 已存在，执行 pnpm install 确保依赖最新...');
  } else {
    logInfo('正在安装依赖，首次安装可能需要几分钟...');
  }

  try {
    execSync('pnpm install', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    logSuccess('依赖安装完成');
  } catch (error) {
    throw new Error(`依赖安装失败: ${error.message}`);
  }
}

async function checkMysqlConnection() {
  logStep('检查 MySQL 连接');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  try {
    const conn = await mysql.createConnection(config);
    await conn.execute('SELECT 1');
    logSuccess(`MySQL 连接成功: ${config.user}@${config.host}:${config.port}`);

    const dbName = process.env.DB_NAME || 'vnerpdacahng';
    const [rows] = await conn.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (rows.length === 0) {
      logInfo(`数据库 ${dbName} 不存在，正在创建...`);
      await conn.execute(
        `CREATE DATABASE \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci`
      );
      logSuccess(`数据库 ${dbName} 创建成功`);
    } else {
      logInfo(`数据库 ${dbName} 已存在`);
    }

    await conn.end();
    return true;
  } catch (error) {
    throw new Error(`MySQL 连接失败: ${error.message}\n请检查 .env 中的数据库配置是否正确。`);
  }
}

async function executeSqlFile(conn, filePath, label) {
  if (!fs.existsSync(filePath)) {
    logWarn(`${label}: SQL 文件不存在，跳过: ${path.relative(projectRoot, filePath)}`);
    return false;
  }

  logInfo(`正在执行: ${path.relative(projectRoot, filePath)}`);

  let sql = fs.readFileSync(filePath, 'utf8');
  sql = sql.replace(/CREATE DATABASE.*?;/gsi, '');
  sql = sql.replace(/USE \`.*?\`;/g, '');

  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      success++;
    } catch (e) {
      if (
        e.code === 'ER_TABLE_EXISTS_ERROR' ||
        e.code === 'ER_DUP_ENTRY' ||
        e.code === 'ER_DUP_FIELDNAME'
      ) {
        skipped++;
      } else {
        failed++;
        console.error(`  执行失败: ${e.code} - ${e.message.slice(0, 100)}`);
      }
    }
  }

  logSuccess(`${label} 完成: 成功 ${success} 条，跳过 ${skipped} 条，失败 ${failed} 条`);
  return failed === 0;
}

async function setupDatabase() {
  logStep('初始化数据库表结构');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    multipleStatements: true,
  };

  const conn = await mysql.createConnection(config);

  try {
    const schemaFile = path.join(projectRoot, 'database', 'actual_schema.sql');
    await executeSqlFile(conn, schemaFile, '建表脚本');

    logInfo('执行系统表初始化...');
    const sysFiles = [
      'permission_system_tables.sql',
      'organization.sql',
      'workflow_engine.sql',
      'audit_system_tables.sql',
    ];
    for (const file of sysFiles) {
      const filePath = path.join(projectRoot, 'database', file);
      await executeSqlFile(conn, filePath, path.basename(file));
    }

    if (options.seed || options.full) {
      logStep('导入种子数据');
      const seedFile = path.join(projectRoot, 'database', 'seeds', 'seed.js');
      if (fs.existsSync(seedFile)) {
        logInfo('执行种子数据脚本...');
        try {
          execSync(`node "${seedFile}"`, {
            cwd: projectRoot,
            stdio: 'inherit',
            env: { ...process.env },
          });
          logSuccess('种子数据导入完成');
        } catch (e) {
          logWarn(`种子数据脚本执行异常: ${e.message}`);
        }
      }
    }

    if (options.demo || options.full) {
      logStep('导入 Demo 数据');
      const demoSeed = path.join(projectRoot, 'database', 'seeds', 'demo_seed_data.sql');
      await executeSqlFile(conn, demoSeed, 'Demo 数据');

      const mockData = path.join(projectRoot, 'database', 'mock_data_all_modules.sql');
      await executeSqlFile(conn, mockData, 'Mock 数据');
    }

    if (options.full) {
      logStep('导入菜单配置');
      const menuFiles = [
        'dcprint_menus.sql',
        'hr_menus.sql',
        'quality_menus.sql',
      ];
      for (const file of menuFiles) {
        const filePath = path.join(projectRoot, 'database', file);
        await executeSqlFile(conn, filePath, path.basename(file));
      }
    }

    logSuccess('数据库初始化完成');
  } finally {
    await conn.end();
  }
}

async function runMigrations() {
  logStep('执行数据库迁移');

  const migrationScript = path.join(projectRoot, 'scripts', 'run-migration.ts');
  if (!fs.existsSync(migrationScript)) {
    logWarn('迁移脚本不存在，跳过');
    return;
  }

  try {
    execSync('npx tsx scripts/run-migration.ts', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    logSuccess('迁移执行完成');
  } catch (e) {
    logWarn(`迁移执行异常: ${e.message}`);
  }
}

async function generateEnvFile() {
  logStep('生成 .env 配置文件');

  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');

  if (fs.existsSync(envPath)) {
    logWarn('.env 文件已存在，跳过生成');
    return;
  }

  const envContent = `# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vnerpdacahng

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# 服务配置
PORT=5000
NEXT_PUBLIC_APP_URL=http://localhost:5000

# 备份配置（可选）
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  logSuccess('.env 文件已生成，请修改数据库密码等配置后重新运行');
  logInfo('配置文件路径: ' + envPath);
}

function showHelp() {
  console.log(`
VNERP 项目一键初始化脚本

用法:
  node scripts/init-project.js [选项]

选项:
  --seed        初始化 + 导入种子数据
  --demo        初始化 + 导入 Demo 数据
  --full        完整初始化（表 + 种子 + Demo + 菜单）
  --skip-deps   跳过依赖安装
  --env         生成 .env 配置模板
  -h, --help    显示帮助信息

示例:
  # 基础初始化（仅建表）
  node scripts/init-project.js

  # 完整初始化（推荐开发环境）
  node scripts/init-project.js --full

  # 仅生成配置文件
  node scripts/init-project.js --env

  # 跳过依赖安装直接初始化数据库
  node scripts/init-project.js --full --skip-deps
`);
}

async function main() {
  console.log(`\n${'╔'.padEnd(58, '═')}╗`);
  console.log('║          VN ERP 项目一键初始化工具          ║');
  console.log(`╚${'═'.repeat(58)}╝`);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.env) {
    await generateEnvFile();
    console.log('\n请修改 .env 中的配置后，重新运行本脚本进行初始化。');
    process.exit(0);
  }

  try {
    const hasEnv = loadEnv();
    if (!hasEnv) {
      logWarn('未找到 .env 文件，将使用默认配置');
      logInfo('如需自定义配置，请先运行: node scripts/init-project.js --env');
    }

    await checkDependencies();
    await installDependencies();
    await checkMysqlConnection();
    await setupDatabase();
    await runMigrations();

    console.log(`\n${'🎉'.repeat(10)}`);
    console.log('  项目初始化完成！');
    console.log(`${'🎉'.repeat(10)}\n`);

    console.log('📋 执行的步骤：');
    steps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`);
    });

    console.log('\n🚀 下一步操作：');
    console.log('   1. 启动开发服务: pnpm dev');
    console.log('   2. 访问 http://localhost:5000');
    console.log('   3. 默认账号: admin / admin123');

    console.log('\n📚 其他命令：');
    console.log('   pnpm test:unit     运行单元测试');
    console.log('   pnpm test          运行 E2E 测试');
    console.log('   pnpm lint          代码检查');
    console.log('   pnpm build         生产构建');

    console.log('');
  } catch (error) {
    console.log('');
    logError(`初始化失败: ${error.message}`);
    console.log('\n🔧 故障排查：');
    console.log('   1. 确认 MySQL 服务已启动');
    console.log('   2. 确认 .env 中的数据库配置正确');
    console.log('   3. 确认数据库用户有创建表的权限');
    console.log('   4. 查看上方日志定位具体失败步骤');
    process.exit(1);
  }
}

main();
