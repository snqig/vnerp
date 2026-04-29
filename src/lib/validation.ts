// 输入验证工具库
// 提供常用的参数验证函数

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'phone' | 'date';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  message?: string;
  custom?: (value: any) => boolean | string;
}

// 验证器类
export class Validator {
  // 验证单个值
  static validateValue(value: any, rule: ValidationRule): string | null {
    const { field, required, type, min, max, minLength, maxLength, pattern, enum: enumValues, message, custom } = rule;

    // 必填验证
    if (required && (value === undefined || value === null || value === '')) {
      return message || `${field} 为必填项`;
    }

    // 如果值为空且不是必填，跳过其他验证
    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // 类型验证
    if (type) {
      const typeError = this.validateType(value, type, field);
      if (typeError) return message || typeError;
    }

    // 数值范围验证
    if (type === 'number' || typeof value === 'number') {
      if (min !== undefined && value < min) {
        return message || `${field} 不能小于 ${min}`;
      }
      if (max !== undefined && value > max) {
        return message || `${field} 不能大于 ${max}`;
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        return message || `${field} 长度不能少于 ${minLength} 个字符`;
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return message || `${field} 长度不能超过 ${maxLength} 个字符`;
      }
    }

    // 数组长度验证
    if (Array.isArray(value)) {
      if (minLength !== undefined && value.length < minLength) {
        return message || `${field} 至少需要 ${minLength} 项`;
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return message || `${field} 最多只能有 ${maxLength} 项`;
      }
    }

    // 正则表达式验证
    if (pattern && !pattern.test(String(value))) {
      return message || `${field} 格式不正确`;
    }

    // 枚举值验证
    if (enumValues && !enumValues.includes(value)) {
      return message || `${field} 必须是以下值之一: ${enumValues.join(', ')}`;
    }

    // 自定义验证
    if (custom) {
      const customResult = custom(value);
      if (customResult !== true) {
        return typeof customResult === 'string' ? customResult : (message || `${field} 验证失败`);
      }
    }

    return null;
  }

  // 类型验证
  private static validateType(value: any, type: string, field: string): string | null {
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

  // 验证对象
  static validate(data: Record<string, any>, rules: ValidationRule[]): ValidationResult {
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

  // 快速验证必填字段
  static validateRequired(data: Record<string, any>, fields: string[]): ValidationResult {
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

// 常用验证规则预设
export const ValidationPresets = {
  // ID验证
  id: (field = 'id'): ValidationRule => ({
    field,
    required: true,
    type: 'number',
    min: 1,
  }),

  // 名称验证
  name: (field = 'name', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100,
  }),

  // 编码验证
  code: (field = 'code', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: `${field} 只能包含字母、数字、下划线和横线`,
  }),

  // 邮箱验证
  email: (field = 'email', required = true): ValidationRule => ({
    field,
    required,
    type: 'email',
    maxLength: 100,
  }),

  // 手机号验证
  phone: (field = 'phone', required = true): ValidationRule => ({
    field,
    required,
    type: 'phone',
  }),

  // 数量验证
  quantity: (field = 'quantity', required = true, min = 0, max?: number): ValidationRule => ({
    field,
    required,
    type: 'number',
    min,
    ...(max !== undefined && { max }),
  }),

  // 金额验证
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

  // 状态验证
  status: (field = 'status', required = true, enumValues: any[] = [0, 1]): ValidationRule => ({
    field,
    required,
    type: 'number',
    enum: enumValues,
  }),

  // 日期验证
  date: (field = 'date', required = true): ValidationRule => ({
    field,
    required,
    type: 'date',
  }),

  // 备注验证
  remark: (field = 'remark', required = false, maxLength = 500): ValidationRule => ({
    field,
    required,
    type: 'string',
    maxLength,
  }),
};

// 请求体验证中间件
export function validateRequestBody(rules: ValidationRule[]) {
  return (body: Record<string, any>): ValidationResult => {
    return Validator.validate(body, rules);
  };
}

// 常用字段验证组合
export const CommonValidations = {
  // 分页参数验证
  pagination: (data: Record<string, any>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'page', required: false, type: 'number', min: 1 },
      { field: 'pageSize', required: false, type: 'number', min: 1, max: 1000 },
    ]);
  },

  // ID参数验证
  id: (data: Record<string, any>): ValidationResult => {
    return Validator.validate(data, [ValidationPresets.id()]);
  },

  // 员工信息验证
  employee: (data: Record<string, any>): ValidationResult => {
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

  // 薪资信息验证
  salary: (data: Record<string, any>): ValidationResult => {
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

  // 品质检验验证
  qualityInspection: (data: Record<string, any>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'cardId', required: true, type: 'number', min: 1 },
      { field: 'inspectResult', required: true, type: 'string', enum: ['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap'] },
      ValidationPresets.quantity('qualifiedQty', false, 0),
      ValidationPresets.quantity('defectQty', false, 0),
      ValidationPresets.name('inspector', false),
      ValidationPresets.remark('remark', false),
    ]);
  },
};
