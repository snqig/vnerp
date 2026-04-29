import { NextRequest } from 'next/server';

// 敏感字段列表
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'creditCard',
  'cardNo',
  'idCard',
  'phone',
  'mobile',
  'email',
  'address',
];

// 敏感数据脱敏规则
const MASK_RULES: Record<string, (value: string) => string> = {
  password: () => '********',
  passwd: () => '********',
  pwd: () => '********',
  token: (v) => v.substring(0, 10) + '...',
  secret: () => '********',
  key: (v) => v.substring(0, 4) + '****',
  authorization: (v) => v.substring(0, 15) + '...',
  cookie: () => '********',
  creditCard: (v) => v.replace(/(\d{4})\d+(\d{4})/, '$1****$2'),
  cardNo: (v) => v.replace(/(\d{4})\d+(\d{4})/, '$1****$2'),
  idCard: (v) => v.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
  phone: (v) => v.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
  mobile: (v) => v.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
  email: (v) => {
    const [local, domain] = v.split('@');
    return local.substring(0, 2) + '***@' + domain;
  },
};

/**
 * 脱敏对象中的敏感字段
 * @param obj 原始对象
 * @returns 脱敏后的对象
 */
export function maskSensitiveData<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item)) as unknown as T;
  }

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // 检查是否为敏感字段
    const sensitiveField = SENSITIVE_FIELDS.find((f) => 
      lowerKey.includes(f.toLowerCase())
    );

    if (sensitiveField && typeof value === 'string') {
      // 应用脱敏规则
      const rule = MASK_RULES[sensitiveField];
      masked[key] = rule ? rule(value) : '********';
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked as T;
}

/**
 * 脱敏SQL查询参数
 * @param params 查询参数数组
 * @returns 脱敏后的参数
 */
export function maskSqlParams(params: any[]): any[] {
  return params.map((param) => {
    if (typeof param === 'string' && param.length > 20) {
      // 可能是敏感数据，进行脱敏
      return param.substring(0, 10) + '...';
    }
    return param;
  });
}

/**
 * 脱敏URL中的敏感信息
 * @param url URL字符串
 * @returns 脱敏后的URL
 */
export function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 脱敏查询参数
    for (const [key, value] of urlObj.searchParams) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((f) => lowerKey.includes(f))) {
        urlObj.searchParams.set(key, '********');
      }
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 脱敏请求头
 * @param headers 请求头对象
 * @returns 脱敏后的请求头
 */
export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'authorization' || lowerKey === 'cookie') {
      masked[key] = value.substring(0, 10) + '...';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * 安全日志记录
 * @param level 日志级别
 * @param message 日志消息
 * @param data 附加数据
 */
export function secureLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const maskedData = data ? maskSensitiveData(data) : undefined;
  
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...maskedData,
  };

  // 根据级别输出日志
  switch (level) {
    case 'debug':
      if (process.env.DEBUG === 'true') {
        console.debug('[DEBUG]', logEntry);
      }
      break;
    case 'info':
      console.info('[INFO]', logEntry);
      break;
    case 'warn':
      console.warn('[WARN]', logEntry);
      break;
    case 'error':
      console.error('[ERROR]', logEntry);
      break;
  }
}

/**
 * 记录API访问日志
 * @param request 请求对象
 * @param response 响应对象
 * @param userId 用户ID
 * @param executionTime 执行时间
 */
export async function logApiAccess(
  request: NextRequest,
  response: Response,
  userId?: number,
  executionTime?: number
) {
  try {
    const url = maskUrl(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const logData = {
      userId,
      method: request.method,
      url,
      headers: maskHeaders(headers),
      statusCode: response.status,
      executionTime,
      ip: (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    secureLog('info', 'API Access', logData);
  } catch (error) {
    console.error('Failed to log API access:', error);
  }
}

/**
 * 数据库查询日志（脱敏版）
 * @param sql SQL语句
 * @param params 查询参数
 * @param duration 执行时间
 */
export function logDbQuery(sql: string, params?: any[], duration?: number) {
  const maskedParams = params ? maskSqlParams(params) : undefined;
  
  secureLog('debug', 'DB Query', {
    sql: sql.substring(0, 200), // 限制长度
    params: maskedParams,
    duration: duration ? `${duration}ms` : undefined,
  });
}
