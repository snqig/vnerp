
import { useTranslations } from 'next-intl';
/**
 * 系统配置测试数据工厂
 */

export interface ConfigFixture {
  id: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: number;
  description: string | null;
  deleted: number;
}

export function createConfig(overrides: Partial<ConfigFixture> = {}): ConfigFixture {
  const ts = useTranslations('Common');
  return {
    id: 1,
    config_name: ts('k_xrpsh6'),
    config_key: 'test_config',
    config_value: 'test_value',
    config_type: 1,
    description: null,
    deleted: 0,
    ...overrides,
  };
}

export function createCompanyNameConfig(): ConfigFixture {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  return createConfig({
    id: 1,
    config_name: tc('companyName'),
    config_key: 'company_name',
    config_value: ts('k_1vp2qgc'),
    description: ts('k_9zp85d'),
  });
}

export function createCompanyShortNameConfig(): ConfigFixture {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  return createConfig({
    id: 2,
    config_name: tc('companyShortName'),
    config_key: 'company_short_name',
    config_value: ts('k_17moz1y'),
    description: ts('k_1bzzmt5'),
  });
}

export function createSystemVersionConfig(): ConfigFixture {
  const ts = useTranslations('Common');
  return createConfig({
    id: 3,
    config_name: ts('k_tesjdn'),
    config_key: 'system_version',
    config_value: '1.0.0',
    config_type: 2,
  });
}

export function createConfigList(): ConfigFixture[] {
  return [createCompanyNameConfig(), createCompanyShortNameConfig(), createSystemVersionConfig()];
}
