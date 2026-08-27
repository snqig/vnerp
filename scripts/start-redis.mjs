#!/usr/bin/env node
/**
 * 一键启动 Redis（开发环境）
 *
 * 优先使用 Docker；若 Docker 不可用则尝试本地安装的 redis-server。
 * 启动后做一次 PING 健康检查，确认 6379 端口可用。
 *
 * 用法: node scripts/start-redis.mjs
 */
import { execSync, spawn } from 'child_process';

const PORT = process.env.REDIS_PORT || '6379';
const CONTAINER_NAME = 'vnerp-redis';

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}

function hasDocker() {
  return run('docker --version') !== null;
}

function hasRedisServer() {
  return run('redis-server --version') !== null;
}

function hasDockerCompose() {
  return run('docker compose version') !== null;
}

function isRedisUp(host = '127.0.0.1', port = PORT) {
  const out = run(`node -e "const n=require('net');const s=n.connect(${port},'{host}',()=>{s.end('PING\\r\\n');});s.on('data',d=>{process.stdout.write(d);s.end();});s.on('error',()=>process.exit(1));s.setTimeout(2000,()=>process.exit(1));"`);
  return out && out.includes('PONG');
}

function startViaDocker() {
  console.log('[1/3] 使用 Docker 启动 Redis...');
  const existing = run(`docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`);
  if (existing === CONTAINER_NAME) {
    console.log(`  容器 ${CONTAINER_NAME} 已存在，正在启动...`);
    run(`docker start ${CONTAINER_NAME}`);
  } else {
    console.log(`  创建并启动容器 ${CONTAINER_NAME}...`);
    run(`docker run -d --name ${CONTAINER_NAME} -p ${PORT}:6379 redis:7-alpine redis-server --appendonly yes`);
  }
}

function startViaDockerCompose() {
  console.log('[1/3] 使用 docker compose 启动 Redis...');
  run('docker compose up -d redis', { cwd: process.cwd() });
}

function startLocal() {
  console.log('[1/3] 使用本地 redis-server 启动...');
  const child = spawn('redis-server', ['--port', PORT, '--appendonly', 'yes'], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
}

async function main() {
  console.log('=== ERP Redis 一键启动 ===\n');

  if (isRedisUp()) {
    console.log('✓ Redis 已在运行 (127.0.0.1:' + PORT + ')，无需重复启动。');
    process.exit(0);
  }

  if (hasDocker()) {
    if (hasDockerCompose()) {
      startViaDockerCompose();
    } else {
      startViaDocker();
    }
  } else if (hasRedisServer()) {
    startLocal();
  } else {
    console.error('✗ 未检测到 Docker 或 redis-server。');
    console.error('');
    console.error('请选择以下方式之一：');
    console.error('  1. 安装 Docker Desktop: https://www.docker.com/products/docker-desktop');
    console.error('  2. 安装 Redis: https://redis.io/docs/getting-started/');
    console.error('  3. 若无需 Redis 功能，移除 .env 中的 REDIS_URL 并将 EVENT_BUS_TYPE 设置为 memory');
    process.exit(1);
  }

  console.log('[2/3] 等待 Redis 就绪...');
  let ready = false;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (isRedisUp()) {
      ready = true;
      break;
    }
    process.stdout.write('.');
  }
  console.log('');

  if (ready) {
    console.log('[3/3] ✓ Redis 已就绪 (127.0.0.1:' + PORT + ')');
    console.log('\n现在可以启动 ERP 开发服务器: pnpm dev:webpack');
  } else {
    console.error('[3/3] ✗ Redis 启动超时，请检查日志。');
    process.exit(1);
  }
}

main();
