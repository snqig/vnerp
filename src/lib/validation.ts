/**
 * @module 输入验证工具库
 * @description 提供通用的参数验证功能，包括类型验证、范围验证、正则表达式验证等。
 *   支持自定义验证规则和常用验证预设，用于 API 请求体、表单数据等场景的数据校验。
 */

/**
 * 验证结果接口
 * @description 封装单次验证操作的结果，包含是否通过验证以及错误信息列表
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 验证错误信息列表，为空表示全部通过 */
  errors: string[];
}

/**
 * 单条验证规则接口
 * @description 定义某个字段的验证约束条件，支持必填、类型、范围、长度、正则、枚举、自定义验证等
 */
export interface ValidationRule {
  /** 字段名称 */
  field: string;
  /** 是否为必填项 */
  required?: boolean;
  /** 期望的数据类型 */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'phone' | 'date';
  /** 数值最小值 */
  min?: number;
  /** 数值最大值 */
  max?: number;
  /** 字符串或数组的最小长度 */
  minLength?: number;
  /** 字符串或数组的最大长度 */
  maxLength?: number;
  /** 正则表达式匹配规则 */
  pattern?: RegExp;
  /** 允许的枚举值列表 */
  enum?: (string | number)[];
  /** 自定义错误消息，覆盖默认错误消息 */
  message?: string;
  /** 自定义验证函数，返回 true 表示通过，返回字符串表示错误消息 */
  custom?: (value: unknown) => boolean | string;
}

/**
 * 验证器类
 * @description 提供静态方法执行数据验证，支持单值验证、批量对象验证和必填字段快速验证
 */
export class Validator {
  static validateValue<T>(value: T, rule: ValidationRule): string | null {
    const {
      field,
      required,
      type,
      min,
      max,
      minLength,
      maxLength,
      pattern,
      enum: enumValues,
      message,
      custom,
    } = rule;

    if (required && (value === undefined || value === null || value === '')) {
      return message || `${field} 为必填项`;
    }

    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    if (type) {
      const typeError = this.validateType(value, type, field);
      if (typeError) return message || typeError;
    }

    if (type === 'number' || typeof value === 'number') {
      if (min !== undefined && value < min) {
        return message || `${field} 不能小于 ${min}`;
      }
      if (max !== undefined && value > max) {
        return message || `${field} 不能大于 ${max}`;
      }
    }

    if (typeof value === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        return message || `${field} 长度不能少于 ${minLength} 个字符`;
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return message || `${field} 长度不能超过 ${maxLength} 个字符`;
      }
    }

    if (Array.isArray(value)) {
      if (minLength !== undefined && value.length < minLength) {
        return message || `${field} 至少需要 ${minLength} 项`;
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return message || `${field} 最多只能有 ${maxLength} 项`;
      }
    }

    if (pattern && !pattern.test(String(value))) {
      return message || `${field} 格式不正确`;
    }

    if (enumValues && !enumValues.includes(value)) {
      return message || `${field} 必须是以下值之一: ${enumValues.join(', ')}`;
    }

    if (custom) {
      const customResult = custom(value);
      if (customResult !== true) {
        return typeof customResult === 'string' ? customResult : message || `${field} 验证失败`;
      }
    }

    return null;
  }

  private static validateType(value: unknown, type: string, field: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return `${field} 必须是字符串`;
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return `${field} 必须是数字`;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return `${field} 必须是布尔值`;
        break;
      case 'array':
        if (!Array.isArray(value)) return `${field} 必须是数组`;
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `${field} 必须是对象`;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) return `${field} 必须是有效的邮箱地址`;
        break;
      case 'phone':
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(String(value))) return `${field} 必须是有效的手机号码`;
        break;
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) return `${field} 必须是有效的日期`;
        break;
    }
    return null;
  }

  static validate(data: Record<string, unknown>, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const error = this.validateValue(value, rule);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateRequired(data: Record<string, unknown>, fields: string[]): ValidationResult {
    const errors: string[] = [];

    for (const field of fields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`${field} 为必填项`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const ValidationPresets = {
  id: (field = 'id'): ValidationRule => ({
    field,
    required: true,
    type: 'number',
    min: 1,
  }),

  name: (field = 'name', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100,
  }),

  code: (field = 'code', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: `${field} 只能包含字母、数字、下划线和横线`,
  }),

  email: (field = 'email', required = true): ValidationRule => ({
    field,
    required,
    type: 'email',
    maxLength: 100,
  }),

  phone: (field = 'phone', required = true): ValidationRule => ({
    field,
    required,
    type: 'phone',
  }),

  quantity: (field = 'quantity', required = true, min = 0, max?: number): ValidationRule => ({
    field,
    required,
    type: 'number',
    min,
    ...(max !== undefined && { max }),
  }),

  amount: (field = 'amount', required = true, min = 0): ValidationRule => ({
    field,
    required,
    type: 'number',
    min,
    custom: (value) => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2 || `${field} 最多只能有2位小数`;
    },
  }),

  status: (field = 'status', required = true, enumValues: (string | number)[] = [0, 1]): ValidationRule => ({
    field,
    required,
    type: 'number',
    enum: enumValues,
  }),

  date: (field = 'date', required = true): ValidationRule => ({
    field,
    required,
    type: 'date',
  }),

  remark: (field = 'remark', required = false, maxLength = 500): ValidationRule => ({
    field,
    required,
    type: 'string',
    maxLength,
  }),
};

export function validateRequestBody(rules: ValidationRule[]) {
  return (body: Record<string, unknown>): ValidationResult => {
    return Validator.validate(body, rules);
  };
}

export const CommonValidations = {
  pagination: (data: Record<string, unknown>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'page', required: false, type: 'number', min: 1 },
      { field: 'pageSize', required: false, type: 'number', min: 1, max: 1000 },
    ]);
  },

  id: (data: Record<string, unknown>): ValidationResult => {
    return Validator.validate(data, [ValidationPresets.id()]);
  },

  employee: (data: Record<string, unknown>): ValidationResult => {
    return Validator.validate(data, [
      ValidationPresets.code('employee_no'),
      ValidationPresets.name('name'),
      { field: 'gender', required: true, type: 'number', enum: [1, 2] },
      { field: 'dept_id', required: true, type: 'number', min: 1 },
      ValidationPresets.name('position', false),
      ValidationPresets.phone('phone', false),
      ValidationPresets.email('email', false),
    ]);
  },

  salary: (data: Record<string, unknown>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'employeeId', required: true, type: 'number', min: 1 },
      { field: 'month', required: true, type: 'string', pattern: /^\d{4}-\d{2}$/ },
      ValidationPresets.amount('basicSalary', false),
      ValidationPresets.amount('positionAllowance', false),
      ValidationPresets.amount('performanceBonus', false),
      ValidationPresets.amount('overtimePay', false),
      ValidationPresets.amount('otherBonus', false),
      ValidationPresets.amount('socialSecurity', false),
      ValidationPresets.amount('housingFund', false),
      ValidationPresets.amount('personalTax', false),
      ValidationPresets.amount('otherDeduction', false),
      ValidationPresets.remark('remark', false),
    ]);
  },

  qualityInspection: (data: Record<string, unknown>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'cardId', required: true, type: 'number', min: 1 },
      {
        field: 'inspectResult',
        required: true,
        type: 'string',
        enum: ['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap'],
      },
      ValidationPresets.quantity('qualifiedQty', false, 0),
      ValidationPresets.quantity('defectQty', false, 0),
      ValidationPresets.name('inspector', false),
      ValidationPresets.remark('remark', false),
    ]);
  },
};
