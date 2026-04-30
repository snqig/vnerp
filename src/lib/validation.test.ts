import { describe, it, expect } from 'vitest'
import { Validator, CommonValidations, ValidationPresets, validateRequestBody } from './validation'

describe('验证工具测试', () => {
  describe('Validator.validateValue - 单值验证', () => {
    it('应该验证必填字段', () => {
      const result = Validator.validateValue('', { field: 'username', required: true })
      expect(result).toBe('username 为必填项')
    })

    it('应该通过非空必填字段', () => {
      const result = Validator.validateValue('john', { field: 'username', required: true })
      expect(result).toBeNull()
    })

    it('应该跳过非必填空字段的其他验证', () => {
      const result = Validator.validateValue('', { field: 'remark', required: false, type: 'string' })
      expect(result).toBeNull()
    })

    it('应该验证字符串类型', () => {
      const result = Validator.validateValue(123, { field: 'name', type: 'string' })
      expect(result).toBe('name 必须是字符串')
    })

    it('应该验证数字类型', () => {
      const result = Validator.validateValue('abc', { field: 'age', type: 'number' })
      expect(result).toBe('age 必须是数字')
    })

    it('应该验证邮箱格式', () => {
      const result = Validator.validateValue('invalid-email', { field: 'email', type: 'email' })
      expect(result).toBe('email 必须是有效的邮箱地址')
    })

    it('应该通过有效邮箱', () => {
      const result = Validator.validateValue('test@example.com', { field: 'email', type: 'email' })
      expect(result).toBeNull()
    })

    it('应该验证手机号格式', () => {
      const result = Validator.validateValue('123456', { field: 'phone', type: 'phone' })
      expect(result).toBe('phone 必须是有效的手机号码')
    })

    it('应该通过有效手机号', () => {
      const result = Validator.validateValue('13800138000', { field: 'phone', type: 'phone' })
      expect(result).toBeNull()
    })

    it('应该验证最小长度', () => {
      const result = Validator.validateValue('ab', { field: 'password', minLength: 6 })
      expect(result).toBe('password 长度不能少于 6 个字符')
    })

    it('应该验证最大长度', () => {
      const result = Validator.validateValue('abcdefghij', { field: 'code', maxLength: 5 })
      expect(result).toBe('code 长度不能超过 5 个字符')
    })

    it('应该验证数值最小值', () => {
      const result = Validator.validateValue(5, { field: 'age', type: 'number', min: 18 })
      expect(result).toBe('age 不能小于 18')
    })

    it('应该验证数值最大值', () => {
      const result = Validator.validateValue(150, { field: 'age', type: 'number', max: 120 })
      expect(result).toBe('age 不能大于 120')
    })

    it('应该验证枚举值', () => {
      const result = Validator.validateValue('invalid', { field: 'status', enum: ['active', 'inactive'] })
      expect(result).toBe('status 必须是以下值之一: active, inactive')
    })

    it('应该通过有效枚举值', () => {
      const result = Validator.validateValue('active', { field: 'status', enum: ['active', 'inactive'] })
      expect(result).toBeNull()
    })

    it('应该验证正则表达式', () => {
      const result = Validator.validateValue('abc123', { field: 'code', pattern: /^[A-Z]+$/ })
      expect(result).toBe('code 格式不正确')
    })

    it('应该通过正则表达式验证', () => {
      const result = Validator.validateValue('ABC', { field: 'code', pattern: /^[A-Z]+$/ })
      expect(result).toBeNull()
    })

    it('应该支持自定义验证函数', () => {
      const result = Validator.validateValue(5, {
        field: 'number',
        custom: (value) => value > 10 || '必须大于10',
      })
      expect(result).toBe('必须大于10')
    })

    it('应该通过自定义验证', () => {
      const result = Validator.validateValue(15, {
        field: 'number',
        custom: (value) => value > 10 || '必须大于10',
      })
      expect(result).toBeNull()
    })
  })

  describe('Validator.validate - 对象验证', () => {
    it('应该验证对象中的多个字段', () => {
      const result = Validator.validate(
        { username: '', age: 'invalid' },
        [
          { field: 'username', required: true },
          { field: 'age', type: 'number' },
        ]
      )
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('应该通过有效对象验证', () => {
      const result = Validator.validate(
        { username: 'john', age: 25 },
        [
          { field: 'username', required: true },
          { field: 'age', type: 'number', min: 18 },
        ]
      )
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('CommonValidations - 常用验证', () => {
    it('应该验证分页参数', () => {
      const result = CommonValidations.pagination({ page: 0, pageSize: 1001 })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该通过有效分页参数', () => {
      const result = CommonValidations.pagination({ page: 1, pageSize: 20 })
      expect(result.valid).toBe(true)
    })

    it('应该验证员工信息', () => {
      const result = CommonValidations.employee({
        employee_no: '',
        name: '',
        gender: 3,
        dept_id: 0,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该通过有效员工信息', () => {
      const result = CommonValidations.employee({
        employee_no: 'EMP001',
        name: '张三',
        gender: 1,
        dept_id: 1,
      })
      expect(result.valid).toBe(true)
    })

    it('应该验证薪资信息', () => {
      const result = CommonValidations.salary({
        employeeId: 0,
        month: '2024-13',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该通过有效薪资信息', () => {
      const result = CommonValidations.salary({
        employeeId: 1,
        month: '2024-03',
        basicSalary: 5000,
      })
      expect(result.valid).toBe(true)
    })

    it('应该验证品质检验信息', () => {
      const result = CommonValidations.qualityInspection({
        cardId: 0,
        inspectResult: 'invalid',
        qualifiedQty: -1,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该通过有效品质检验信息', () => {
      const result = CommonValidations.qualityInspection({
        cardId: 1,
        inspectResult: 'pass',
        qualifiedQty: 100,
        defectQty: 0,
        inspector: '张三',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('ValidationPresets - 预设验证', () => {
    it('应该验证编码格式', () => {
      const rule = ValidationPresets.code('test')
      expect(rule.field).toBe('test')
      expect(rule.required).toBe(true)
      expect(rule.pattern).toBeDefined()
    })

    it('应该验证名称格式', () => {
      const rule = ValidationPresets.name('test', true)
      expect(rule.field).toBe('test')
      expect(rule.required).toBe(true)
      expect(rule.minLength).toBe(1)
      expect(rule.maxLength).toBe(100)
    })

    it('应该验证邮箱格式', () => {
      const rule = ValidationPresets.email('email')
      expect(rule.type).toBe('email')
      expect(rule.maxLength).toBe(100)
    })

    it('应该验证手机号格式', () => {
      const rule = ValidationPresets.phone('phone')
      expect(rule.type).toBe('phone')
    })

    it('应该验证数量范围', () => {
      const rule = ValidationPresets.quantity('qty', true, 0, 100)
      expect(rule.min).toBe(0)
      expect(rule.max).toBe(100)
    })

    it('应该验证金额小数位', () => {
      const rule = ValidationPresets.amount('price')
      expect(rule.custom).toBeDefined()
      const result = Validator.validateValue(100.999, rule)
      expect(result).toContain('最多只能有2位小数')
    })

    it('应该验证状态枚举', () => {
      const rule = ValidationPresets.status('status', true, [0, 1])
      expect(rule.enum).toEqual([0, 1])
    })

    it('应该验证日期类型', () => {
      const rule = ValidationPresets.date('birthday')
      expect(rule.type).toBe('date')
    })

    it('应该验证备注长度', () => {
      const rule = ValidationPresets.remark('note', false, 200)
      expect(rule.maxLength).toBe(200)
      expect(rule.required).toBe(false)
    })
  })

  describe('validateRequestBody - 请求体验证', () => {
    it('应该验证请求体', () => {
      const validator = validateRequestBody([
        { field: 'name', required: true },
        { field: 'age', type: 'number', min: 0 },
      ])
      const result = validator({ name: '', age: -1 })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该通过有效请求体', () => {
      const validator = validateRequestBody([
        { field: 'name', required: true },
        { field: 'age', type: 'number', min: 0 },
      ])
      const result = validator({ name: '张三', age: 20 })
      expect(result.valid).toBe(true)
    })
  })

  describe('Validator.validateValue - 边界情况', () => {
    it('应该处理空字符串', () => {
      const result = Validator.validateValue('', { field: 'test', required: true })
      expect(result).toContain('test 为必填项')
    })

    it('应该处理null值', () => {
      const result = Validator.validateValue(null, { field: 'test', required: true })
      expect(result).toContain('test 为必填项')
    })

    it('应该处理undefined值', () => {
      const result = Validator.validateValue(undefined, { field: 'test', required: true })
      expect(result).toContain('test 为必填项')
    })

    it('应该处理非必填的null值', () => {
      const result = Validator.validateValue(null, { field: 'test', required: false })
      expect(result).toBeNull()
    })

    it('应该验证字符串最小长度', () => {
      const result = Validator.validateValue('ab', { field: 'test', minLength: 3 })
      expect(result).toContain('长度不能少于 3 个字符')
    })

    it('应该验证字符串最大长度', () => {
      const result = Validator.validateValue('abcdef', { field: 'test', maxLength: 3 })
      expect(result).toContain('长度不能超过 3 个字符')
    })

    it('应该验证数字最小值', () => {
      const result = Validator.validateValue(5, { field: 'test', type: 'number', min: 10 })
      expect(result).toContain('不能小于 10')
    })

    it('应该验证数字最大值', () => {
      const result = Validator.validateValue(15, { field: 'test', type: 'number', max: 10 })
      expect(result).toContain('不能大于 10')
    })

    it('应该验证枚举值', () => {
      const result = Validator.validateValue('c', { field: 'test', enum: ['a', 'b'] })
      expect(result).toContain('必须是以下值之一: a, b')
    })

    it('应该验证正则表达式', () => {
      const result = Validator.validateValue('123', { field: 'test', pattern: /^[a-z]+$/ })
      expect(result).toContain('test 格式不正确')
    })
  })
})