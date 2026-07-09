/**
 * 前端统一错误处理工具
 * 将后端错误信息转换为用户友好的提示
 */

// 错误码到友好消息的映射
const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '您没有权限执行此操作',
  INVALID_TOKEN: '登录凭证无效，请重新登录',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  LOGIN_FAILED: '用户名或密码错误',
  ACCOUNT_LOCKED: '账号已锁定，请稍后再试',
  ACCOUNT_DISABLED: '账号已被禁用，请联系管理员',

  // 权限相关
  PERMISSION_DENIED: '权限不足，请联系管理员',
  ROLE_NOT_FOUND: '角色不存在',
  INSUFFICIENT_PRIVILEGES: '您的权限不足以执行此操作',

  // 数据相关
  NOT_FOUND: '请求的数据不存在',
  DUPLICATE_ENTRY: '数据已存在，请勿重复添加',
  DATA_INTEGRITY_ERROR: '数据完整性错误，请检查关联数据',
  FOREIGN_KEY_ERROR: '该数据被其他记录引用，无法删除',
  VALIDATION_ERROR: '数据验证失败，请检查输入',

  // 业务相关
  INSUFFICIENT_STOCK: '库存不足，无法出库',
  ORDER_STATUS_ERROR: '订单状态不允许此操作',
  APPROVAL_PENDING: '该单据正在审批中，请勿重复提交',
  ALREADY_APPROVED: '该单据已审批，请勿重复操作',
  BATCH_EXPIRED: '批次已过期',
  COST_CALCULATION_ERROR: '成本计算错误',

  // 系统相关
  INTERNAL_ERROR: '系统内部错误，请稍后重试',
  DATABASE_ERROR: '数据库操作失败，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络',
  RATE_LIMITED: '操作过于频繁，请稍后再试',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
};

// HTTP状态码到友好消息的映射
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误，请检查输入',
  401: '登录已过期，请重新登录',
  403: '您没有权限执行此操作',
  404: '请求的资源不存在',
  409: '数据冲突，请刷新后重试',
  422: '数据验证失败，请检查输入',
  429: '操作过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '服务暂时不可用，请稍后重试',
  503: '服务维护中，请稍后重试',
};

export interface AppError {
  code?: string;
  message?: string;
  status?: number;
  details?: Loose;
}

/**
 * 将后端错误转换为用户友好的提示信息
 */
export function getErrorMessage(error: unknown): string {
  // 网络错误
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return '网络连接失败，请检查网络设置';
  }

  // Response对象
  if (error instanceof Response) {
    return HTTP_ERROR_MESSAGES[error.status] || `请求失败 (${error.status})`;
  }

  // 自定义错误对象
  if (error && typeof error === 'object') {
    const err = error as AppError;

    // 优先使用错误码映射
    if (err.code && ERROR_MESSAGES[err.code]) {
      return ERROR_MESSAGES[err.code];
    }

    // HTTP状态码映射
    if (err.status && HTTP_ERROR_MESSAGES[err.status]) {
      return HTTP_ERROR_MESSAGES[err.status];
    }

    // 直接使用错误消息（但过滤掉技术性信息）
    if (err.message) {
      // 过滤掉SQL错误、堆栈信息等技术性内容
      if (err.message.includes('SQL') || err.message.includes('ER_')) {
        return '数据库操作失败，请联系管理员';
      }
      if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        return '网络连接失败，请稍后重试';
      }
      if (err.message.includes('jwt') || err.message.includes('token')) {
        return '登录已过期，请重新登录';
      }
      // 如果消息看起来是用户友好的，直接返回
      if (err.message.length < 100 && !err.message.includes('{') && !err.message.includes('at ')) {
        return err.message;
      }
    }
  }

  // 字符串错误
  if (typeof error === 'string') {
    if (error.length < 100) return error;
  }

  return '操作失败，请稍后重试';
}

/**
 * 处理API响应，统一错误处理
 */
export async function handleApiResponse<T = Loose>(
  response: Response,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (message: string) => void;
    showToast?: boolean;
  }
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const result = await response.json();

    if (result.success) {
      options?.onSuccess?.(result.data);
      return { success: true, data: result.data };
    }

    const message = getErrorMessage({
      code: result.code,
      message: result.message,
      status: response.status,
    });

    options?.onError?.(message);
    return { success: false, message };
  } catch (e) {
    const message = getErrorMessage(e);
    options?.onError?.(message);
    return { success: false, message };
  }
}
