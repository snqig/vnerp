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
  enum?: Loose[];
  /** 自定义错误消息，覆盖默认错误消息 */
  message?: string;
  /** 自定义验证函数，返回 true 表示通过，返回字符串表示错误消息 */
  custom?: (value: Loose) => boolean | string;
}

/**
 * 验证器类
 * @description 提供静态方法执行数据验证，支持单值验证、批量对象验证和必填字段快速验证
 */
export class Validator {
  /**
   * 验证单个值是否符合指定规则
   * @param value - 待验证的值
   * @param rule - 验证规则配置
   * @returns 验证失败时返回错误消息字符串，通过时返回 null
   * @example
   * const error = Validator.validateValue('abc', { field: 'name', required: true, type: 'string', maxLength: 50 });
   * // 返回 null 表示通过验证
   */
  static validateValue(value: Loose, rule: ValidationRule): string | null {
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
        return typeof customResult === 'string' ? customResult : message || `${field} 验证失败`;
      }
    }

    return null;
  }

  /**
   * 类型验证
   * @param value - 待验证的值
   * @param type - 期望的数据类型（string/number/boolean/array/object/email/phone/date）
   * @param field - 字段名称，用于错误消息
   * @returns 验证失败时返回错误消息，通过时返回 null
   * @private
   */
  private static validateType(value: Loose, type: string, field: string): string | null {
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

  /**
   * 批量验证对象中的多个字段
   * @param data - 包含待验证字段的数据对象
   * @param rules - 验证规则数组，按顺序执行
   * @returns 验证结果，包含 valid 状态和 errors 错误列表
   * @example
   * const result = Validator.validate(
   *   { name: '', age: 25 },
   *   [
   *     { field: 'name', required: true, type: 'string' },
   *     { field: 'age', required: true, type: 'number', min: 0 }
   *   ]
   * );
   * // result.valid === false, result.errors === ['name 为必填项']
   */
  static validate(data: Record<string, Loose>, rules: ValidationRule[]): ValidationResult {
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

  /**
   * 快速验证必填字段
   * @param data - 包含待验证字段的数据对象
   * @param fields - 必填字段名称数组
   * @returns 验证结果，未填写的字段会生成对应的错误消息
   * @example
   * const result = Validator.validateRequired({ name: '', email: 'test' }, ['name', 'email']);
   * // result.valid === false, result.errors === ['name 为必填项']
   */
  static validateRequired(data: Record<string, Loose>, fields: string[]): ValidationResult {
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

/**
 * 常用验证规则预设
 * @description 提供一组预配置的验证规则生成函数，涵盖 ID、名称、编码、邮箱、手机号、数量、金额、状态、日期、备注等常用字段类型
 */
export const ValidationPresets = {
  /**
   * ID 验证规则
   * @param field - 字段名称，默认为 'id'
   * @returns 配置好的验证规则：必填、数字类型、最小值为 1
   */
  id: (field = 'id'): ValidationRule => ({
    field,
    required: true,
    type: 'number',
    min: 1,
  }),

  /**
   * 名称验证规则
   * @param field - 字段名称，默认为 'name'
   * @param required - 是否必填，默认为 true
   * @returns 配置好的验证规则：字符串类型、长度 1-100
   */
  name: (field = 'name', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100,
  }),

  /**
   * 编码验证规则
   * @param field - 字段名称，默认为 'code'
   * @param required - 是否必填，默认为 true
   * @returns 配置好的验证规则：字符串类型、长度 1-50、仅允许字母数字下划线和横线
   */
  code: (field = 'code', required = true): ValidationRule => ({
    field,
    required,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: `${field} 只能包含字母、数字、下划线和横线`,
  }),

  /**
   * 邮箱验证规则
   * @param field - 字段名称，默认为 'email'
   * @param required - 是否必填，默认为 true
   * @returns 配置好的验证规则：邮箱格式、最大长度 100
   */
  email: (field = 'email', required = true): ValidationRule => ({
    field,
    required,
    type: 'email',
    maxLength: 100,
  }),

  /**
   * 手机号验证规则
   * @param field - 字段名称，默认为 'phone'
   * @param required - 是否必填，默认为 true
   * @returns 配置好的验证规则：中国大陆手机号格式（1[3-9] XXXXXXXXX）
   */
  phone: (field = 'phone', required = true): ValidationRule => ({
    field,
    required,
    type: 'phone',
  }),

  /**
   * 数量验证规则
   * @param field - 字段名称，默认为 'quantity'
   * @param required - 是否必填，默认为 true
   * @param min - 最小值，默认为 0
   * @param max - 最大值，可选
   * @returns 配置好的验证规则：数字类型、范围限制
   */
  quantity: (field = 'quantity', required = true, min = 0, max?: number): ValidationRule => ({
    field,
    required,
    type: 'number',
    min,
    ...(max !== undefined && { max }),
  }),

  /**
   * 金额验证规则
   * @param field - 字段名称，默认为 'amount'
   * @param required - 是否必填，默认为 true
   * @param min - 最小值，默认为 0
   * @returns 配置好的验证规则：数字类型、最多 2 位小数
   */
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

  /**
   * 状态验证规则
   * @param field - 字段名称，默认为 'status'
   * @param required - 是否必填，默认为 true
   * @param enumValues - 允许的状态值列表，默认为 [0, 1]
   * @returns 配置好的验证规则：数字类型、枚举值限制
   */
  status: (field = 'status', required = true, enumValues: Loose[] = [0, 1]): ValidationRule => ({
    field,
    required,
    type: 'number',
    enum: enumValues,
  }),

  /**
   * 日期验证规则
   * @param field - 字段名称，默认为 'date'
   * @param required - 是否必填，默认为 true
   * @returns 配置好的验证规则：日期格式
   */
  date: (field = 'date', required = true): ValidationRule => ({
    field,
    required,
    type: 'date',
  }),

  /**
   * 备注验证规则
   * @param field - 字段名称，默认为 'remark'
   * @param required - 是否必填，默认为 false
   * @param maxLength - 最大长度，默认为 500
   * @returns 配置好的验证规则：字符串类型、非必填、长度限制
   */
  remark: (field = 'remark', required = false, maxLength = 500): ValidationRule => ({
    field,
    required,
    type: 'string',
    maxLength,
  }),
};

/**
 * 请求体验证中间件工厂函数
 * @description 创建一个验证函数，用于校验 HTTP 请求体的数据
 * @param rules - 验证规则数组
 * @returns 返回一个接收请求体数据并返回验证结果的函数
 * @example
 * const validateBody = validateRequestBody([
 *   { field: 'name', required: true, type: 'string' }
 * ]);
 * const result = validateBody({ name: 'test' });
 */
export function validateRequestBody(rules: ValidationRule[]) {
  return (body: Record<string, Loose>): ValidationResult => {
    return Validator.validate(body, rules);
  };
}

/**
 * 常用字段验证组合
 * @description 提供业务场景中常用的字段组合验证，包括分页参数、ID、员工信息、薪资信息、品质检验等
 */
export const CommonValidations = {
  /**
   * 分页参数验证
   * @param data - 包含 page 和 pageSize 字段的数据对象
   * @returns 验证结果，page 和 pageSize 均为可选、数字类型、page >= 1、pageSize 1-1000
   */
  pagination: (data: Record<string, Loose>): ValidationResult => {
    return Validator.validate(data, [
      { field: 'page', required: false, type: 'number', min: 1 },
      { field: 'pageSize', required: false, type: 'number', min: 1, max: 1000 },
    ]);
  },

  /**
   * ID 参数验证
   * @param data - 包含 id 字段的数据对象
   * @returns 验证结果，id 必填、数字类型、最小值为 1
   */
  id: (data: Record<string, Loose>): ValidationResult => {
    return Validator.validate(data, [ValidationPresets.id()]);
  },

  /**
   * 员工信息验证
   * @param data - 包含员工信息的数据库对象
   * @returns 验证结果，包含工号、姓名、性别、部门ID、职位、手机号、邮箱等字段验证
   */
  employee: (data: Record<string, Loose>): ValidationResult => {
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

  /**
   * 薪资信息验证
   * @param data - 包含薪资信息的数据对象
   * @returns 验证结果，包含员工ID、月份、各项薪资组成字段的验证
   */
  salary: (data: Record<string, Loose>): ValidationResult => {
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

  /**
   * 品质检验验证
   * @param data - 包含品质检验信息的数据对象
   * @returns 验证结果，包含工序卡ID、检验结果、合格/缺陷数量、检验员、备注等字段验证
   */
  qualityInspection: (data: Record<string, Loose>): ValidationResult => {
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
