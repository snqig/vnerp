import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';

// 导入自定义规则
import noChineseHardcode from './eslint-rules/no-chinese-hardcode.js';
import dddLayerDependencies from './eslint-rules/ddd-layer-dependencies.js';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // 注册自定义规则
  {
    plugins: {
      'i18n': {
        rules: {
          'no-chinese-hardcode': noChineseHardcode,
        },
      },
      'ddd': {
        rules: {
          'layer-dependencies': dddLayerDependencies,
        },
      },
    },
  },
  
  // 配置自定义规则
  {
    rules: {
      // 启用禁止硬编码中文规则（警告级别）
      'i18n/no-chinese-hardcode': ['warn', {
        // 允许包含中文的函数名（这些函数已经处理了国际化）
        allowInFunctions: [
          'tc',           // next-intl 翻译函数
          't',            // 常见翻译函数
          'useTranslations',
          'formatMessage', // intl.formatMessage
        ],

        // 允许包含中文的文件路径
        allowInFiles: [
          'i18n/',
          'locales/',
          'messages/',
        ],

        // 忽略注释中的中文
        ignoreComments: true,

        // 是否生成翻译key建议
        generateTranslationKey: true,

        // 额外忽略的文件模式
        ignorePatterns: [
          'node_modules/',
          '.next/',
          'dist/',
          'build/',
        ],
      }],

      // DDD 分层依赖约束（警告级别，项目有历史债务需逐步清理）
      // 违规样本：src/domain/production/repositories/IScheduleRepository.ts 导入 @/lib/db/schema
      // 违规样本：src/domain/warehouse/value-objects/WarehouseStateMachine.ts 导入 @/lib/logger
      'ddd/layer-dependencies': ['warn', {
        // 领域层额外允许的导入（历史债务过渡期白名单）
        allowPatterns: {
          domain: [
            '@/lib/logger',       // 暂时允许，应迁移为领域异常或纯函数
            '@/lib/decimal-utils', // 纯数学工具，允许
            '@/lib/money',        // 金额值对象，允许
          ],
        },
      }],

      // 限制 console 使用：允许 error/warn，禁止 log/debug/info
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // react-hooks/set-state-in-effect 降级为 warning
      // 该规则对已有大量 useEffect+fetch 模式误报为 error，逐步迁移
      'react-hooks/set-state-in-effect': 'warn',

      // React Compiler 严格规则降级为 warning（项目逐步迁移到 React Compiler）
      // 这些规则对已有大量 Hooks 模式误报为 error，阻塞 CI 构建
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // 禁止显式 any 类型（警告级别，逐步清理）
      '@typescript-eslint/no-explicit-any': 'warn',

      // 未使用变量：允许下划线前缀（约定为有意未使用）
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],

      // ban-ts-comment：允许 @ts-nocheck（dcprint/trace/route.ts 有未修复的 TS 错误）
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': false,
        'ts-check': false,
      }],

      // 禁止无意义的类型断言（如 as any）
      '@typescript-eslint/no-unsafe-assignment': 'off', // 暂时关闭，清理 any 后再开启
      '@typescript-eslint/no-unsafe-member-access': 'off', // 暂时关闭，清理 any 后再开启
      '@typescript-eslint/no-unsafe-call': 'off', // 暂时关闭，清理 any 后再开启
      '@typescript-eslint/no-unsafe-return': 'off', // 暂时关闭，清理 any 后再开启
      '@typescript-eslint/no-unsafe-argument': 'off', // 暂时关闭，清理 any 后再开启
    },
  },
  
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',

    // 忽略i18n相关文件
    'messages/**',
    'eslint-rules/**',

    // 全局 Loose 类型定义（any 别名，逐步替换为具体类型）
    'src/types/loose.d.ts',

    // 脚本目录允许 console（Node.js 脚本标准输出）
    'scripts/**',

    // 忽略测试文件（可选，根据项目需求调整）
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/__tests__/**',
  ])
]);

export default eslintConfig;
