// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '@/lib/api-response';

describe('sanitizeInput', () => {
  it('should escape HTML script tags', () => {
    const result = sanitizeInput('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should escape double quotes', () => {
    const result = sanitizeInput('test"value');
    expect(result).toContain('&quot;');
    expect(result).not.toContain('"');
  });

  it('should escape single quotes', () => {
    const result = sanitizeInput("test'value");
    expect(result).toContain('&#x27;');
  });

  it('should not modify forward slashes', () => {
    const result = sanitizeInput('path/to/file');
    expect(result).toBe('path/to/file');
  });

  it('should escape angle brackets', () => {
    const result = sanitizeInput('<div>content</div>');
    expect(result).toContain('&lt;div&gt;');
  });

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should handle plain text with minimal changes', () => {
    const result = sanitizeInput('hello world');
    expect(result).toBe('hello world');
  });
});

describe('sanitizeObject', () => {
  it('should sanitize all string fields in a flat object', () => {
    const input = { name: '<b>test</b>', age: 25, active: true };
    const result = sanitizeObject(input);
    expect(result.name).not.toContain('<b>');
    expect(result.age).toBe(25);
    expect(result.active).toBe(true);
  });

  it('should handle nested objects recursively', () => {
    const input = { user: { name: '<script>xss</script>', email: 'test@test.com' } };
    const result = sanitizeObject(input);
    expect(result.user.name).not.toContain('<script>');
    expect(result.user.email).toBe('test@test.com');
  });

  it('should handle arrays of strings', () => {
    const input = { items: ['<b>1</b>', '<b>2</b>'] };
    const result = sanitizeObject(input);
    expect(result.items[0]).not.toContain('<b>');
    expect(result.items[1]).not.toContain('<b>');
  });

  it('should handle arrays of objects', () => {
    const input = { users: [{ name: '<script>a</script>' }, { name: 'normal' }] };
    const result = sanitizeObject(input);
    expect(result.users[0].name).not.toContain('<script>');
    expect(result.users[1].name).toBe('normal');
  });

  it('should preserve numbers and booleans', () => {
    const input = { count: 42, enabled: false, ratio: 3.14 };
    const result = sanitizeObject(input);
    expect(result.count).toBe(42);
    expect(result.enabled).toBe(false);
    expect(result.ratio).toBe(3.14);
  });

  it('should handle null and undefined values', () => {
    const input = { a: null, b: undefined, c: 'safe' };
    const result = sanitizeObject(input);
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
    expect(result.c).toBe('safe');
  });

  it('should handle empty object', () => {
    const result = sanitizeObject({});
    expect(result).toEqual({});
  });

  it('should handle string input directly', () => {
    const result = sanitizeObject('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });
});
