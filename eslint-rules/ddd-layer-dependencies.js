/**
 * ESLint 自定义规则：DDD 分层依赖约束
 *
 * 规则功能：
 * 根据 DDD 分层架构，约束各层的导入依赖方向，防止架构腐化：
 * - 领域层（domain）禁止依赖基础设施、表现层、框架
 * - 应用层（application）禁止依赖表现层、框架
 * - 基础设施层（infrastructure）禁止依赖表现层
 *
 * 配置选项：
 * - allowPatterns: 额外允许的导入路径白名单（追加到默认白名单）
 * - forbidPatterns: 额外禁止的导入路径黑名单（追加到默认黑名单）
 * - layers: 覆盖默认的分层规则（高级用法）
 */

const path = require('path');

const DEFAULT_LAYER_RULES = {
  domain: {
    forbidden: [
      '@/infrastructure',
      '@/app',
      '@/lib',
      'next',
      'react',
      'react-dom',
      'drizzle-orm',
      'ioredis',
      'redis',
      'kafkajs',
      '@nestjs',
    ],
    allow: [
      '@/domain',
      '@/lib/decimal-utils',
      '@/lib/money',
    ],
  },
  application: {
    forbidden: [
      '@/app',
      'next',
      'react',
      'react-dom',
      'next-intl',
      'next/link',
      'sonner',
    ],
    allow: [
      '@/application',
      '@/domain',
      '@/infrastructure',
      '@/lib',
    ],
  },
  infrastructure: {
    forbidden: [
      '@/app',
      'next',
      'react',
      'react-dom',
      'next-intl',
    ],
    allow: [],
  },
};

function detectLayer(filename) {
  const normalized = (filename || '').replace(/\\/g, '/');
  if (normalized.includes('/src/domain/')) return 'domain';
  if (normalized.includes('/src/application/')) return 'application';
  if (normalized.includes('/src/infrastructure/')) return 'infrastructure';
  return null;
}

function matchesPattern(source, pattern) {
  if (pattern.startsWith('@/')) {
    return source === pattern || source.startsWith(pattern + '/');
  }
  return source === pattern || source.startsWith(pattern + '/');
}

function isAllowed(source, allowList) {
  return allowList.some((pattern) => matchesPattern(source, pattern));
}

function isForbidden(source, forbiddenList) {
  return forbiddenList.some((pattern) => matchesPattern(source, pattern));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '约束 DDD 分层依赖方向，防止架构腐化',
      category: 'Architecture',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowPatterns: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          forbidPatterns: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          layers: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                forbidden: { type: 'array', items: { type: 'string' } },
                allow: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbiddenImport:
        '{{layer}} 层禁止导入 "{{source}}"。DDD 分层约束：领域层不应依赖基础设施/框架，应用层不应依赖表现层/框架，基础设施层不应依赖表现层。',
      forbiddenImportWithHint:
        '{{layer}} 层禁止导入 "{{source}}"。{{hint}}',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const filename = context.filename || context.getFilename();

    const layer = detectLayer(filename);
    if (!layer) return {};

    const customLayers = options.layers || {};
    const baseRule = customLayers[layer] || DEFAULT_LAYER_RULES[layer];
    if (!baseRule) return {};

    const extraAllow = (options.allowPatterns && options.allowPatterns[layer]) || [];
    const extraForbid = (options.forbidPatterns && options.forbidPatterns[layer]) || [];

    const allowList = [...(baseRule.allow || []), ...extraAllow];
    const forbiddenList = [...(baseRule.forbidden || []), ...extraForbid];

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        if (isForbidden(source, forbiddenList) && !isAllowed(source, allowList)) {
          context.report({
            node,
            messageId: 'forbiddenImport',
            data: {
              layer,
              source,
            },
          });
        }
      },

      ExportNamedDeclaration(node) {
        if (node.source && typeof node.source.value === 'string') {
          const source = node.source.value;
          if (isForbidden(source, forbiddenList) && !isAllowed(source, allowList)) {
            context.report({
              node,
              messageId: 'forbiddenImport',
              data: {
                layer,
                source,
              },
            });
          }
        }
      },

      ExportAllDeclaration(node) {
        if (node.source && typeof node.source.value === 'string') {
          const source = node.source.value;
          if (isForbidden(source, forbiddenList) && !isAllowed(source, allowList)) {
            context.report({
              node,
              messageId: 'forbiddenImport',
              data: {
                layer,
                source,
              },
            });
          }
        }
      },
    };
  },
};
