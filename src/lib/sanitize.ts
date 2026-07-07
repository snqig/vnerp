import he from 'he';

/**
 * XSS 防护：HTML 实体编码工具
 *
 * 策略：在入库前对长文本字段（备注、描述、工艺说明等）进行 HTML 实体编码，
 * 防止存储型 XSS 攻击。即使前端忘记转义，数据库中也不会有原始 HTML 标签。
 *
 * 使用 he 库做实体编码，不依赖 DOM（DOMPurify 需浏览器环境）。
 * 适用场景：remark / description / content / process_note 等自由文本字段。
 * 不适用场景：JSON 结构数据、已编码数据、数字/日期等非文本字段。
 */

/**
 * 对单个字符串进行 HTML 实体编码
 * 编码字符：< > & " '
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (text == null) return null;
  if (typeof text !== 'string') return text as any;
  return he.encode(text, { useNamedReferences: false });
}

/**
 * 递归对对象中所有字符串值进行 HTML 实体编码
 * 跳过指定的字段名（如 JSON 数据字段）
 *
 * @example
 * sanitizeObject({ name: '<script>', remark: 'test & co' })
 * // => { name: '&lt;script&gt;', remark: 'test &amp; co' }
 */
export function sanitizeObject<T>(obj: T, skipFields?: string[]): T {
  if (obj == null) return obj;
  if (typeof obj === 'string') return sanitizeText(obj) as any;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, skipFields)) as any;
  if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof RegExp)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (skipFields?.includes(key)) {
        result[key] = value;
      } else {
        result[key] = sanitizeObject(value, skipFields);
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * 仅对指定字段进行 HTML 实体编码（推荐用于精确控制）
 *
 * @example
 * sanitizeFields(data, ['remark', 'description', 'process_note'])
 */
export function sanitizeFields<T extends Record<string, any>>(
  obj: T,
  fields: string[]
): T {
  if (obj == null || typeof obj !== 'object') return obj;
  const result: Record<string, any> = { ...obj };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = sanitizeText(result[field]);
    }
  }
  return result as T;
}
