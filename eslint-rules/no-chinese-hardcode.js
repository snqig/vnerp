/**
 * ESLint 自定义规则：禁止硬编码中文文本
 * 
 * 规则功能：
 * 1. 检测JSX中的中文硬编码文本（<div>中文</div>）
 * 2. 检测字符串字面量中的中文（const msg = '中文'）
 * 3. 检测模板字符串中的中文（`中文`）
 * 4. 检测toast/confirm/errorResponse等函数调用中的中文参数
 * 
 * 配置选项：
 * - allowInFunctions: 允许包含中文的函数名列表（默认：[]）
 * - allowInFiles: 允许包含中文的文件路径模式列表（默认：[]）
 * - ignoreComments: 是否忽略注释中的中文（默认：true）
 * - generateTranslationKey: 是否生成翻译key建议（默认：true）
 */

const path = require('path');

// 中文字符正则表达式
const CHINESE_REGEX = /[\u4e00-\u9fa5]+/;

// 默认允许包含中文的函数（通常是已经处理国际化的函数）
const DEFAULT_ALLOWED_FUNCTIONS = [
  'tc',           // next-intl 的翻译函数
  't',            // 常见翻译函数
  'useTranslations', // next-intl hook
];

// 默认忽略的文件模式
const DEFAULT_IGNORE_PATTERNS = [
  /\/i18n\//,           // i18n配置目录
  /\/locales\//,        // 语言文件目录
  /\/messages\//,       // 消息文件目录
  /\.test\./,           // 测试文件
  /\.spec\./,           // 测试文件
  /\/__tests__\//,      // 测试目录
];

/**
 * 检查字符串是否包含中文
 */
function containsChinese(str) {
  return CHINESE_REGEX.test(str);
}

/**
 * 检查文件路径是否应该被忽略
 */
function shouldIgnoreFile(filePath, ignorePatterns) {
  const normalizedPath = path.normalize(filePath);
  return ignorePatterns.some(pattern => pattern.test(normalizedPath));
}

/**
 * 生成翻译key建议
 */
function generateTranslationKey(chineseText) {
  // 简单的key生成策略：使用拼音首字母或简短描述
  // 这里只返回占位符，实际项目可能需要更智能的生成策略
  const length = chineseText.length;
  const hash = simpleHash(chineseText);
  return `text_${hash}`;
}

/**
 * 简单哈希函数
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * 检查是否在允许的函数调用中
 */
function isInAllowedFunction(node, allowedFunctions) {
  let current = node.parent;
  
  while (current) {
    if (current.type === 'CallExpression') {
      const callee = current.callee;
      
      // 检查函数名
      if (callee.type === 'Identifier' && allowedFunctions.includes(callee.name)) {
        return true;
      }
      
      // 检查成员表达式 (如 obj.t('中文'))
      if (callee.type === 'MemberExpression' && 
          callee.property.type === 'Identifier' && 
          allowedFunctions.includes(callee.property.name)) {
        return true;
      }
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * 检查是否在导入语句中
 */
function isInImport(node) {
  let current = node.parent;
  
  while (current) {
    if (current.type === 'ImportDeclaration') {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * 检查是否在导出语句中
 */
function isInExport(node) {
  let current = node.parent;
  
  while (current) {
    if (current.type === 'ExportNamedDeclaration' || 
        current.type === 'ExportDefaultDeclaration') {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * 创建错误报告
 */
function createReport(context, node, text, options) {
  const { generateTranslationKey: shouldGenerateKey } = options;
  
  const suggestion = shouldGenerateKey 
    ? `建议使用: tc('${generateTranslationKey(text)}')`
    : '建议使用国际化函数 tc()';
  
  return {
    node,
    messageId: 'noChineseHardcode',
    data: { text, suggestion },
    // Auto-fix disabled: blind tc() conversion breaks module-scope code
    // where tc (from useTranslations) is not in scope. i18n migration
    // should be done manually with proper scope handling.
    fix() {
      return null;
    }
  };
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '禁止硬编码中文文本，强制使用国际化函数',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/your-repo/docs/i18n-eslint-rule.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowInFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          allowInFiles: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          ignoreComments: {
            type: 'boolean',
            default: true,
          },
          generateTranslationKey: {
            type: 'boolean',
            default: true,
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noChineseHardcode: '禁止硬编码中文文本: "{{text}}"。{{suggestion}}',
      noChineseInJSX: '禁止在JSX中硬编码中文文本: "{{text}}"。{{suggestion}}',
      noChineseInFunction: '禁止在函数调用中硬编码中文参数: "{{text}}"。{{suggestion}}',
    },
  },
  
  create(context) {
    const options = context.options[0] || {};
    const {
      allowInFunctions = [],
      allowInFiles = [],
      ignoreComments = true,
      generateTranslationKey: shouldGenerateKey = true,
      ignorePatterns = [],
    } = options;
    
    // 合并默认允许的函数
    const allowedFunctions = [...DEFAULT_ALLOWED_FUNCTIONS, ...allowInFunctions];
    
    // 合并默认忽略的模式
    const allIgnorePatterns = [
      ...DEFAULT_IGNORE_PATTERNS,
      ...ignorePatterns.map(p => new RegExp(p)),
    ];
    
    // 检查当前文件是否应该被忽略
    const filePath = context.filename || context.getFilename();
    if (shouldIgnoreFile(filePath, allIgnorePatterns)) {
      return {};
    }
    
    // 检查文件路径白名单
    for (const pattern of allowInFiles) {
      if (filePath.includes(pattern)) {
        return {};
      }
    }
    
    return {
      // 检查字符串字面量
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!containsChinese(node.value)) return;
        
        // 忽略注释
        if (ignoreComments && node.parent.type === 'JSXAttribute') {
          // JSX属性中的注释通常不需要国际化
          return;
        }
        
        // 忽略导入导出语句
        if (isInImport(node) || isInExport(node)) {
          return;
        }
        
        // 检查是否在允许的函数中
        if (isInAllowedFunction(node, allowedFunctions)) {
          return;
        }
        
        context.report(createReport(context, node, node.value, {
          generateTranslationKey: shouldGenerateKey,
        }));
      },
      
      // 检查模板字符串
      TemplateLiteral(node) {
        // 检查模板字符串的静态部分
        for (const quasi of node.quasis) {
          if (containsChinese(quasi.value.raw)) {
            // 忽略导入导出语句
            if (isInImport(node) || isInExport(node)) {
              continue;
            }
            
            // 检查是否在允许的函数中
            if (isInAllowedFunction(node, allowedFunctions)) {
              continue;
            }
            
            context.report({
              node,
              messageId: 'noChineseHardcode',
              data: {
                text: quasi.value.raw,
                suggestion: shouldGenerateKey 
                  ? `建议使用: tc(\`${generateTranslationKey(quasi.value.raw)}\`)`
                  : '建议使用国际化函数 tc()',
              },
            });
          }
        }
      },
      
      // 检查JSX文本
      JSXText(node) {
        if (!containsChinese(node.value)) return;
        
        // 去除空白后检查
        const trimmed = node.value.trim();
        if (!trimmed || !containsChinese(trimmed)) return;
        
        context.report({
          node,
          messageId: 'noChineseInJSX',
          data: {
            text: trimmed,
            suggestion: shouldGenerateKey
              ? `建议使用: {tc('${generateTranslationKey(trimmed)}')}`
              : '建议使用国际化函数 {tc()}',
          },
          fix() {
            return null;
          },
        });
      },
      
      // 检查JSX属性中的中文
      JSXAttribute(node) {
        if (node.value && node.value.type === 'Literal' && 
            typeof node.value.value === 'string' && 
            containsChinese(node.value.value)) {
          
          // 某些属性可能需要允许中文（如title, aria-label等）
          const allowedAttributes = ['title', 'aria-label', 'placeholder'];
          if (allowedAttributes.includes(node.name.name)) {
            return;
          }
          
          context.report({
            node: node.value,
            messageId: 'noChineseInJSX',
            data: {
              text: node.value.value,
              suggestion: shouldGenerateKey 
                ? `建议使用: {tc('${generateTranslationKey(node.value.value)}')}`
                : '建议使用国际化函数 tc()',
            },
          });
        }
      },
      
      // 检查函数调用中的中文参数（特别是toast, confirm等）
      CallExpression(node) {
        const callee = node.callee;
        
        // 获取函数名
        let functionName = '';
        if (callee.type === 'Identifier') {
          functionName = callee.name;
        } else if (callee.type === 'MemberExpression' && 
                   callee.property.type === 'Identifier') {
          functionName = callee.property.name;
        }
        
        // 需要特别检查的函数（这些函数通常需要国际化）
        const i18nSensitiveFunctions = [
          'toast', 'confirm', 'alert', 'error', 'warning', 'info', 'success',
          'errorResponse', 'showError', 'showMessage', 'showToast',
        ];
        
        if (!i18nSensitiveFunctions.includes(functionName)) {
          return;
        }
        
        // 检查参数
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && 
              typeof arg.value === 'string' && 
              containsChinese(arg.value)) {
            
            context.report({
              node: arg,
              messageId: 'noChineseInFunction',
              data: {
                text: arg.value,
                suggestion: shouldGenerateKey 
                  ? `建议使用: tc('${generateTranslationKey(arg.value)}')`
                  : '建议使用国际化函数 tc()',
              },
            });
          }
          
          // 检查对象参数中的message/title等属性
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.key && prop.key.type === 'Identifier' &&
                  ['message', 'title', 'description', 'content', 'text'].includes(prop.key.name) &&
                  prop.value && prop.value.type === 'Literal' &&
                  typeof prop.value.value === 'string' &&
                  containsChinese(prop.value.value)) {
                
                context.report({
                  node: prop.value,
                  messageId: 'noChineseInFunction',
                  data: {
                    text: prop.value.value,
                    suggestion: shouldGenerateKey 
                      ? `建议使用: tc('${generateTranslationKey(prop.value.value)}')`
                      : '建议使用国际化函数 tc()',
                  },
                });
              }
            }
          }
        }
      },
    };
  },
};
