/**
 * 系统配置测试数据工厂
 */

export interface ConfigFixture {
  id: number
  config_name: string
  config_key: string
  config_value: string
  config_type: number
  description: string | null
  deleted: number
}

export function createConfig(overrides: Partial<ConfigFixture> = {}): ConfigFixture {
  return {
    id: 1,
    config_name: '测试配置',
    config_key: 'test_config',
    config_value: 'test_value',
    config_type: 1,
    description: null,
    deleted: 0,
    ...overrides,
  }
}

export function createCompanyNameConfig(): ConfigFixture {
  return createConfig({
    id: 1,
    config_name: '公司名称',
    config_key: 'company_name',
    config_value: '越南达昌科技有限公司',
    description: '系统显示的公司全称',
  })
}

export function createCompanyShortNameConfig(): ConfigFixture {
  return createConfig({
    id: 2,
    config_name: '公司简称',
    config_key: 'company_short_name',
    config_value: '达昌科技',
    description: '系统显示的公司简称',
  })
}

export function createSystemVersionConfig(): ConfigFixture {
  return createConfig({
    id: 3,
    config_name: '系统版本',
    config_key: 'system_version',
    config_value: '1.0.0',
    config_type: 2,
  })
}

export function createConfigList(): ConfigFixture[] {
  return [
    createCompanyNameConfig(),
    createCompanyShortNameConfig(),
    createSystemVersionConfig(),
  ]
}