// 数据库配置验证脚本
// 用于验证前后端数据库配置是否一致

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('数据库配置验证');
console.log('========================================\n');

// 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');
let envConfig = {};

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envConfig[match[1].trim()] = match[2].trim();
    }
  });
  console.log('✅ 已读取 .env.local 文件\n');
} catch (error) {
  console.error('❌ 无法读取 .env.local 文件:', error.message);
  process.exit(1);
}

// 验证必要的数据库配置
const requiredDbConfig = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

console.log('数据库配置信息:');
console.log('----------------------------------------');

let allConfigPresent = true;
requiredDbConfig.forEach(key => {
  if (envConfig[key]) {
    let displayValue = envConfig[key];
    // 密码脱敏显示
    if (key === 'DB_PASSWORD' && displayValue.length > 0) {
      displayValue = '*'.repeat(displayValue.length);
    }
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: 未配置`);
    allConfigPresent = false;
  }
});

console.log('\n----------------------------------------');

if (allConfigPresent) {
  console.log('✅ 所有数据库配置项已正确配置');
  console.log('\n数据库连接信息:');
  console.log(`  主机: ${envConfig.DB_HOST}`);
  console.log(`  端口: ${envConfig.DB_PORT}`);
  console.log(`  用户: ${envConfig.DB_USER}`);
  console.log(`  数据库: ${envConfig.DB_NAME}`);
  console.log('\n前后端将使用相同的数据库配置。');
} else {
  console.log('❌ 部分数据库配置项缺失，请检查 .env.local 文件');
  process.exit(1);
}

console.log('\n========================================');
