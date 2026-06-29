# ESLint 国际化规则使用文档

## 概述

本规则用于检测代码中的硬编码中文文本，强制使用国际化函数（如 `tc()`），确保项目的国际化一致性。

## 规则功能

### 检测范围

1. **JSX文本内容**
   ```jsx
   // ❌ 错误
   <div>这是中文文本</div>
   
   // ✅ 正确
   <div>{tc('text_abc123')}</div>
   ```

2. **字符串字面量**
   ```javascript
   // ❌ 错误
   const message = '操作成功';
   
   // ✅ 正确
   const message = tc('success_message');
   ```

3. **模板字符串**
   ```javascript
   // ❌ 错误
   const text = `用户${name}已登录`;
   
   // ✅ 正确
   const text = tc('user_logged_in', { name });
   ```

4. **函数调用参数**
   ```javascript
   // ❌ 错误
   toast('保存成功');
   errorResponse('操作失败');
   
   // ✅ 正确
   toast(tc('save_success'));
   errorResponse(tc('operation_failed'));
   ```

### 自动修复

规则支持自动修复功能，会生成基于内容哈希的翻译key：

```javascript
// 原代码
const msg = '操作成功';

// 自动修复后
const msg = tc('text_a1b2c3');
```

> **注意**：自动生成的key需要手动添加到翻译文件中，并替换为更有意义的key名称。

## 配置选项

### 基础配置

在 `eslint.config.mjs` 中配置：

```javascript
{
  rules: {
    'i18n/no-chinese-hardcode': ['warn', {
      // 允许包含中文的函数名
      allowInFunctions: ['tc', 't', 'useTranslations'],
      
      // 允许包含中文的文件路径
      allowInFiles: ['i18n/', 'locales/', 'messages/'],
      
      // 忽略注释中的中文
      ignoreComments: true,
      
      // 是否生成翻译key建议
      generateTranslationKey: true,
      
      // 额外忽略的文件模式
      ignorePatterns: ['node_modules/', '.next/'],
    }],
  },
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `allowInFunctions` | string[] | ['tc', 't', 'useTranslations'] | 允许包含中文的函数名列表 |
| `allowInFiles` | string[] | [] | 允许包含中文的文件路径模式 |
| `ignoreComments` | boolean | true | 是否忽略注释中的中文 |
| `generateTranslationKey` | boolean | true | 是否生成翻译key建议 |
| `ignorePatterns` | string[] | [] | 额外忽略的文件模式（正则表达式字符串） |

## VSCode 配置

### 手动配置步骤

1. 打开 VSCode 设置（`Ctrl + ,` 或 `Cmd + ,`）
2. 搜索 "eslint"
3. 配置以下选项：

```json
{
  "eslint.enable": true,
  "eslint.run": "onType",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### 或直接编辑 `.vscode/settings.json`

```json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.run": "onType",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## 使用方法

### 1. 运行检查

```bash
# 检查所有文件
pnpm lint

# 检查特定文件
pnpm eslint src/app/page.tsx

# 自动修复
pnpm lint:fix
```

### 2. 在编辑器中查看

- **实时提示**：编辑代码时，VSCode 会实时显示警告
- **问题面板**：查看所有问题（`Ctrl + Shift + M`）
- **快速修复**：点击警告灯泡或按 `Alt + Enter`

### 3. 处理警告

当看到中文硬编码警告时：

1. **查看建议**：ESLint 会提示建议的翻译key
2. **使用快速修复**：自动替换为 `tc('key')`
3. **添加翻译**：将 key 添加到翻译文件
   ```json
   // messages/zh-CN.json
   {
     "text_a1b2c3": "操作成功"
   }
   
   // messages/en.json
   {
     "text_a1b2c3": "Operation successful"
   }
   ```

## 最佳实践

### 1. 命名翻译key

自动生成的key是临时占位符，建议使用有意义的名称：

```javascript
// ❌ 不推荐
tc('text_a1b2c3')

// ✅ 推荐
tc('user.profile.save_success')
tc('order.status.completed')
tc('error.network.timeout')
```

### 2. 组织翻译文件

按模块组织翻译文件：

```json
{
  "user": {
    "profile": {
      "save_success": "保存成功",
      "update_failed": "更新失败"
    }
  },
  "order": {
    "status": {
      "completed": "已完成",
      "pending": "待处理"
    }
  }
}
```

### 3. 使用带参数的翻译

对于动态内容，使用参数化翻译：

```javascript
// ❌ 错误
const msg = `用户 ${name} 已登录`;

// ✅ 正确
const msg = tc('user.logged_in', { name });

// 翻译文件
{
  "user.logged_in": "用户 {name} 已登录"
}
```

### 4. 复数处理

使用 next-intl 的复数功能：

```javascript
tc('items.count', { count: 5 })

// 翻译文件
{
  "items.count": "{count, plural, =0 {无项目} =1 {1个项目} other {#个项目}}"
}
```

## 常见问题

### Q1: 某些文件需要允许中文怎么办？

**A**: 在配置中添加文件路径：

```javascript
allowInFiles: [
  'i18n/',
  'locales/',
  'messages/',
  'scripts/',  // 脚本文件
]
```

### Q2: 某些函数已经处理了国际化怎么办？

**A**: 添加到允许函数列表：

```javascript
allowInFunctions: [
  'tc',
  't',
  'formatMessage',
  'myCustomI18nFunction',
]
```

### Q3: 测试文件中需要使用中文怎么办？

**A**: 测试文件默认会被忽略，如需调整：

```javascript
// 移除测试文件的忽略规则
globalIgnores([
  // 移除测试文件相关配置
])
```

### Q4: 自动修复后如何批量添加翻译？

**A**: 使用项目的 i18n 迁移脚本：

```bash
# 扫描并提取所有翻译key
pnpm run scan-i18n

# 自动生成翻译文件
pnpm run generate-translations
```

### Q5: 规则太严格影响开发怎么办？

**A**: 可以调整为提示级别：

```javascript
// 从 'warn' 改为 'off' 完全关闭
// 或保持 'warn' 但忽略特定情况
'i18n/no-chinese-hardcode': ['warn', {
  // 增加允许列表
  allowInFunctions: [...],
  allowInFiles: [...],
}]
```

## 工作流集成

### Git Hooks

项目已配置 lint-staged，提交代码时会自动检查：

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### CI/CD

在 CI 中添加检查步骤：

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: pnpm lint
```

## 性能优化

规则已进行性能优化：

1. **文件级忽略**：不检查配置的忽略文件
2. **早期返回**：不包含中文的节点快速跳过
3. **缓存机制**：ESLint 内置缓存

## 相关资源

- [next-intl 文档](https://next-intl-docs.vercel.app/)
- [ESLint 自定义规则开发](https://eslint.org/docs/latest/developer-guide/working-with-rules)
- [项目 i18n 配置](../src/i18n/)

## 更新日志

### v1.0.0 (2026-06-05)
- ✨ 初始版本发布
- ✨ 支持检测 JSX、字符串、模板字符串中的中文
- ✨ 支持检测 toast/confirm 等函数调用
- ✨ 支持自动修复功能
- ✨ 支持配置白名单
- ✨ 性能优化
