# MCP Decision Server

MCP 服务器，用于通过 Qwen3.5-2B GGUF 模型进行确定性决策。

## 功能

1. **决策工具**：通过 LLM 模型提供结构化的决策支持
2. **决策历史**：存储和管理过去的决策和结果
3. **决策模式**：收集和应用常见的决策模式和最佳实践
4. **提示词模板**：提供标准的决策框架和风险评估模板

## 快速开始

### 1. 安装和运行

```bash
# 克隆项目
cd /path/to/your/project

# 在根目录下创建 mcp-decision-server 子目录
mkdir mcp-decision-server
cd mcp-decision-server

# 初始化 npm 项目
npm init -y
npm install @modelcontextprotocol/sdk zod typescript tsx --save-dev
npm install @modelcontextprotocol/sdk zod

# 安装 TypeScript 编译器
npm install --save-dev typescript tsx

# 创建 source 文件
mkdir src

# 复制或创建服务器代码...

# 构建项目
npm run build

# 运行服务器
node dist/index.js
```

### 2. 配置

在运行 MCP 服务器的主应用中（如 Claude Code），添加以下配置：

```json
{
  "mcpServers": {
    "decision": {
      "command": "node",
      "args": ["./mcp-decision-server/dist/index.js"],
      "cwd": "./mcp-decision-server"
    }
  }
}
```

或使用绝对路径：

```json
{
  "mcpServers": {
    "decision": {
      "command": "npx",
      "args": ["./@trae-cn/mcps/s_erp-project-a4dfdadc/solo_agent_lite/mcp-decision-server/dist/index.js"],
      "cwd": "."
    }
  }
}
```

### 3. 使用

在 AI 助手对话中，直接使用 `make_decision` 工具：

```
我需要决定如何优化库存管理。选项是：
1. 增加安全库存
2. 减少安全库存
3. 实施 JIT 采购
4. 多供应商策略

使用 make_decision 工具分析并选择最佳方案。
```

工具将自动使用 Qwen3.5-2B 模型分析场景并提供推荐。

## 开发

### 开发模式

```bash
# 开发模式（自动重载）
npx tsx watch src/index.ts
```

### 构建

```bash
# 构建 TypeScript 为 JavaScript
npm run build
```

### 测试

```bash
# 目前没有单元测试，依赖于 MCP Inspector 的集成测试
# 可以使用 MCP Inspector 进行手动测试：
npx @modelcontextprotocol/inspector node dist/index.js
```

## 架构

### 主要组件

1. **LLMClient**：管理与 LLM 服务的连接和通信
2. **Server**：MCP 服务器，注册工具、资源和提示词
3. **Tools**：决策支持工具
4. **Resources**：决策历史、模式库等
5. **Prompts**：决策框架模板

### 数据流

1. AI 助手请求决策 → MCP 服务器
2. MCP 服务器验证参数并构建提示词
3. MCP 服务器调用 LLM 客户端
4. LLM 客户端返回决策结果
5. MCP 服务器返回格式化结果给 AI 助手

## 配置

环境变量配置 LLM 连接参数：

```bash
export LLM_URL="http://localhost:1234/v1"
export LLM_TIMEOUT="30000"
export LLM_TEMPERATURE="0.7"
export LLM_MODEL="qwen3.5-2b"
export LLM_MAX_TOKENS="2048"
```

## 安全考虑

1. **最小权限**：仅提供必要的决策功能
2. **输入验证**：使用 Zod 验证所有输入参数
3. **错误处理**：详细的错误消息和日志
4. **资源管理**：优雅地处理服务器关闭
5. **网络安全**：在生产环境中考虑使用 HTTPS 和认证

## 扩展性

### 添加新工具

1. **工具实现**：在服务器中添加新的 `server.setRequestHandler` 处理程序
2. **参数验证**：为新工具创建 Zod 验证模式
3. **错误处理**：确保适当的错误处理和日志记录

### 添加新资源

1. **资源定义**：在 `resources/list` 处理程序中添加新资源
2. **资源读取**：在 `resources/read` 处理程序中实现读取逻辑

### 添加新提示词

1. **提示词注册**：在 `prompts/list` 处理程序中添加新提示词
2. **提示词获取**：在 `prompts/get` 处理程序中实现获取逻辑

## 注意事项

1. **LLM 服务依赖**：本服务器依赖于运行中的 LLM 服务（如 http://localhost:1234/v1）
2. **网络连接**：确保 LLM 服务可通过网络访问
3. **资源使用**：监控 LLM 服务的资源使用情况
4. **安全**：确保 LLM 服务使用安全协议（HTTPS）和适当的认证
5. **配置**：根据实际 LLM API 调整配置参数

## 许可

本项目采用 MIT 许可。详细信息请参阅 LICENSE 文件。

## 联系

如有任何问题或建议，请在 GitHub 上提交 issue。

---

**注意**：这是一个演示和实验性项目。生产环境中可能需要额外的错误处理、安全性和监控功能。