# 本地开发环境搭建 SOP

> SOP 编号：VNERP-SKILL-001 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 操作系统：Windows 10+ / macOS 12+ / Ubuntu 20.04+
- 已安装 Git
- 已安装 Node.js 18.x LTS
- 已安装 MySQL 8.0
- 可访问项目 Git 仓库

## 操作步骤

### 步骤 1：安装 pnpm

```bash
npm install -g pnpm
pnpm --version  # 验证版本 >= 8.x
```

预期结果：输出 pnpm 版本号

### 步骤 2：克隆项目

```bash
git clone <repo-url> vnerp
cd vnerp
```

预期结果：项目代码下载到本地

### 步骤 3：安装依赖

```bash
pnpm install
```

预期结果：所有依赖安装成功，无报错

### 步骤 4：配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，配置以下变量：

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vnerp

# JWT
JWT_SECRET=your-secret-key-at-least-32-chars
JWT_EXPIRES_IN=2h

# 应用
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

预期结果：`.env.local` 文件创建并配置完成

### 步骤 5：初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vnerp DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 执行初始化脚本
node database/init-db.js
```

预期结果：数据库表创建成功

### 步骤 6：启动开发服务器

```bash
pnpm dev
```

预期结果：
- 控制台输出 `Ready in ...ms`
- 访问 http://localhost:5000 可看到登录页面

### 步骤 7：验证系统

1. 使用默认管理员账号登录
   - 用户名：`admin`
   - 密码：`admin123`
2. 确认首页仪表盘正常显示
3. 确认侧边栏菜单正常加载

## 异常处理

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| pnpm install 失败 | 网络问题 | 配置 npm 镜像：`pnpm config set registry https://registry.npmmirror.com` |
| 数据库连接失败 | MySQL 未启动或密码错误 | 检查 MySQL 服务状态，确认 `.env.local` 配置 |
| 端口 5000 被占用 | 其他程序占用 | 修改 `package.json` 中的端口号 |
| 登录页面空白 | 数据库未初始化 | 重新执行步骤 5 |

## 验证方法

- [ ] `pnpm dev` 启动无报错
- [ ] 登录页面可正常访问
- [ ] 管理员账号可正常登录
- [ ] 首页仪表盘数据正常显示
- [ ] 侧边栏菜单可正常展开
