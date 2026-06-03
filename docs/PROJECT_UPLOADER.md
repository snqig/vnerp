# 项目上传工具使用说明

## 概述

本工具用于将项目文件上传到 GitHub，自动排除 `.` 开头的文件和目录。

## 排除规则

以下文件和目录会被自动排除：

| 类型 | 示例 |
|------|------|
| `.` 开头的文件 | `.gitignore`, `.env`, `.eslintrc.js` |
| `.` 开头的目录 | `.git`, `.next`, `.vscode`, `.idea` |
| 依赖目录 | `node_modules`, `__pycache__` |

## 使用方式

### 方式一：命令行交互界面

```bash
# 启动交互式界面
node scripts/project_uploader.js

# 导出文件列表
node scripts/project_uploader.js --export

# 生成 .gitignore
node scripts/project_uploader.js --gitignore

# 显示帮助
node scripts/project_uploader.js --help
```

### 方式二：Web UI 界面

启动项目后访问：

```
http://localhost:5000/tools/uploader
```

功能：
- 查看所有文件列表
- 搜索过滤文件
- 选择/取消选择文件
- 生成 .gitignore 文件
- 配置 GitHub 仓库信息
- 上传到 GitHub

## 操作步骤

### 1. 生成 .gitignore

点击"生成 .gitignore"按钮，会自动创建包含以下内容的 `.gitignore` 文件：

```gitignore
# 排除 . 开头的文件和目录
.*

# 依赖目录
node_modules/
__pycache__/

# 构建输出
.next/
out/
build/
dist/

# 环境变量
.env
.env.local

# 日志
*.log

# 编辑器
.vscode/
.idea/

# 操作系统
.DS_Store
Thumbs.db
```

### 2. 配置 GitHub 仓库

在"上传设置"标签页中配置：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| 仓库名称 | GitHub 仓库名 | erp-project |
| 仓库描述 | 仓库描述信息 | ERP 项目管理系统 |
| 提交信息 | Git 提交信息 | Initial commit |
| 私有仓库 | 是否为私有仓库 | 否 |

### 3. 上传到 GitHub

点击"上传到 GitHub"按钮，会执行以下步骤：

1. 初始化 Git 仓库（如果需要）
2. 添加所有文件（git 会自动处理 .gitignore）
3. 创建提交
4. 添加远程仓库
5. 推送到 GitHub

## 前置要求

### 安装 GitHub CLI

```bash
# Windows
winget install GitHub.cli

# macOS
brew install gh

# Linux
sudo apt install gh
```

### 登录 GitHub

```bash
gh auth login
```

### 验证登录

```bash
gh auth status
```

## 文件统计

运行 `node scripts/project_uploader.js --export` 后会生成：

- `scripts/file-list.json` - 所有文件列表

当前项目统计：
- **总文件数**: 1433 个
- **排除**: 所有 `.` 开头的文件和目录

## 相关文件

| 文件 | 说明 |
|------|------|
| [project_uploader.js](file:///d:/dcprint/erp-project/scripts/project_uploader.js) | 命令行工具 |
| [project_uploader.py](file:///d:/dcprint/erp-project/scripts/project_uploader.py) | Python GUI 工具 |
| [/tools/uploader](file:///d:/dcprint/erp-project/src/app/tools/uploader/page.tsx) | Web UI 界面 |
| [/api/project-files](file:///d:/dcprint/erp-project/src/app/api/project-files/route.ts) | 文件列表 API |

## 注意事项

1. **敏感文件**: 确保 `.env`、`.env.local` 等敏感文件被排除
2. **大文件**: GitHub 单文件限制 100MB，仓库总大小建议不超过 1GB
3. **分支**: 默认推送到 `main` 分支
4. **远程仓库**: 如果已存在远程仓库，会直接推送

## 故障排除

### gh 命令未找到

```bash
# 安装 GitHub CLI
winget install GitHub.cli
```

### 未登录 GitHub

```bash
# 登录 GitHub
gh auth login
```

### 推送失败

```bash
# 检查远程仓库
git remote -v

# 强制推送（谨慎使用）
git push -f origin main
```

### 文件过大

```bash
# 使用 Git LFS
git lfs install
git lfs track "*.psd"
git lfs track "*.zip"
```
