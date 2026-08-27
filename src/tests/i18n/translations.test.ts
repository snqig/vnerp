/**
 * 翻译键测试
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Translation Keys', () => {
  const messagesDir = path.join(__dirname, '../../../messages');
  
  const zhCN = JSON.parse(fs.readFileSync(path.join(messagesDir, 'zh-CN.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
  const zhTW = JSON.parse(fs.readFileSync(path.join(messagesDir, 'zh-TW.json'), 'utf8'));
  const vi = JSON.parse(fs.readFileSync(path.join(messagesDir, 'vi.json'), 'utf8'));

  it('should have same namespaces in all language files', () => {
    const zhCNNamespaces = Object.keys(zhCN).sort();
    const enNamespaces = Object.keys(en).sort();
    const zhTWNamespaces = Object.keys(zhTW).sort();
    const viNamespaces = Object.keys(vi).sort();

    expect(enNamespaces).toEqual(zhCNNamespaces);
    expect(zhTWNamespaces).toEqual(zhCNNamespaces);
    expect(viNamespaces).toEqual(zhCNNamespaces);
  });

  it('should have Common namespace with required keys', () => {
    const requiredKeys = [
      'save', 'cancel', 'delete', 'edit', 'add',
      'search', 'loading', 'noData', 'success', 'error',
    ];

    for (const key of requiredKeys) {
      expect(zhCN.Common).toHaveProperty(key);
      expect(en.Common).toHaveProperty(key);
      expect(zhTW.Common).toHaveProperty(key);
      expect(vi.Common).toHaveProperty(key);
    }
  });

  it('should not have empty translations in zh-CN', () => {
    function checkEmpty(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.length).toBeGreaterThan(0);
        } else if (typeof value === 'object') {
          checkEmpty(value as Record<string, unknown>, fullPath);
        }
      }
    }

    checkEmpty(zhCN);
  });
});
