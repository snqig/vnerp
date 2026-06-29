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
    
    // 忽略测试文件（可选，根据项目需求调整）
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/__tests__/**',
  ]),
]);

export default eslintConfig;
