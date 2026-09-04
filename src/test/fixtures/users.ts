
import { useTranslations } from 'next-intl';
/**
 * 用户测试数据工厂
 */

export interface UserFixture {
  id: number;
  username: string;
  password: string;
  real_name: string;
  email: string;
  phone: string | null;
  department_id: number | null;
  status: number;
  avatar: string | null;
  first_login: number;
  login_fail_count: number;
  lock_time: string | null;
}

export function createUser(overrides: Partial<UserFixture> = {}): UserFixture {
  const ts = useTranslations('Common');
  return {
    id: 1,
    username: 'admin',
    password: '$2a$10$hashedpassword',
    real_name: ts('k_1yxtyq'),
    email: 'admin@example.com',
    phone: null,
    department_id: 1,
    status: 1,
    avatar: null,
    first_login: 0,
    login_fail_count: 0,
    lock_time: null,
    ...overrides,
  };
}

export function createAdminUser(): UserFixture {
  const ts = useTranslations('Common');
  return createUser({
    id: 1,
    username: 'admin',
    real_name: ts('k_1fcdmqa'),
    email: 'admin@dcprint.com',
  });
}

export function createNormalUser(): UserFixture {
  const ts = useTranslations('Common');
  return createUser({
    id: 2,
    username: 'user001',
    real_name: ts('k_1cfg610'),
    email: 'user@dcprint.com',
    department_id: 2,
  });
}

export function createDisabledUser(): UserFixture {
  const ts = useTranslations('Common');
  return createUser({
    id: 3,
    username: 'disabled',
    real_name: ts('k_1blhdsx'),
    status: 0,
  });
}

export function createLockedUser(): UserFixture {
  const ts = useTranslations('Common');
  return createUser({
    id: 4,
    username: 'locked',
    real_name: ts('k_dg32uj'),
    login_fail_count: 5,
    lock_time: new Date().toISOString(),
  });
}
