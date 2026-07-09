import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';

// 导入自定义规则
import noChineseHardcode from './eslint-rules/no-chinese-hardcode.js';

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

    // 脚本目录允许 console（Node.js 脚本标准输出）
    'scripts/**',

    // 忽略测试文件（可选，根据项目需求调整）
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/__tests__/**',
  ])
]);

export default eslintConfig;
