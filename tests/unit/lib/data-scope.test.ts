// @vitest-environment node
/**
 * 单元测试：数据范围（DataScope）解析 —— 守护 2026-09-26 的 P3-1 修复。
 *
 * 背景：`sys_role.data_scope` 在库里是 tinyint（注释「1-全部, 2-本部门, 3-本部门及下级,
 * 4-仅本人」，另有 5-自定义），而历史实现用字符串键 self/dept/… 去查表，
 * `scopePriority[s] || 0` 恒为 0、`scopePriority` 里又不存在取值为 0 的项，
 * 结果 `Object.entries(...).find(p === 0)` 恒为 undefined → 一律回落 self。
 * 表象是「角色页配了数据范围但实际不生效」。
 *
 * 两个必须守住的点：
 * 1. 数字编码 → DataScope.type 的映射（含现网真实存在的 5）；
 * 2. super_admin 恒为 all —— 否则同时挂 sales(custom) 的 super_admin 会被
 *    「取最严格」逻辑降级成 custom，反而看不到全量单据。
 */

import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('@/lib/db', () => ({ query: mocks.query }));

const { resolveDataScope, getUserInfo } = await import('@/lib/auth');

describe('resolveDataScope —— sys_role.data_scope 数字编码映射', () => {
  it('1 → all（全部）', () => {
    expect(resolveDataScope(['1'], 2)).toEqual({ type: 'all' });
  });

  it('2 → dept，并带上用户所属部门', () => {
    expect(resolveDataScope(['2'], 7)).toEqual({ type: 'dept', deptIds: [7] });
  });

  it('3 → dept_and_self', () => {
    expect(resolveDataScope(['3'], 4)).toEqual({ type: 'dept_and_self', deptIds: [4] });
  });

  it('4 → self', () => {
    expect(resolveDataScope(['4'], 9)).toEqual({ type: 'self' });
  });

  it('5 → custom（现网 sales / warehouse_keeper 就在用这个未写进注释的取值）', () => {
    expect(resolveDataScope(['5'], 121)).toEqual({ type: 'custom', deptIds: [121] });
  });

  it('mysql2 返回 number 而不是 string 时同样能解析', () => {
    expect(resolveDataScope([2 as unknown as string], 3)).toEqual({ type: 'dept', deptIds: [3] });
  });

  it('用户没有部门时 dept 分支的 deptIds 为空数组，不产生 undefined 参数', () => {
    expect(resolveDataScope(['2'], null)).toEqual({ type: 'dept', deptIds: [] });
  });

  it('多角色按最小权限原则取最严格的那一个（dept 严于 custom）', () => {
    expect(resolveDataScope(['5', '2'], 2)).toEqual({ type: 'dept', deptIds: [2] });
  });

  it('全部无法识别的编码 → self（fail-safe，宁严不宽）', () => {
    expect(resolveDataScope(['99'], 2)).toEqual({ type: 'self' });
  });

  it('部分无法识别时忽略异常值，不把它当成更严格的 scope', () => {
    expect(resolveDataScope(['99', '1'], 2)).toEqual({ type: 'all' });
  });

  it('空数组 → self（默认值不变）', () => {
    expect(resolveDataScope([], 2)).toEqual({ type: 'self' });
  });
});

describe('getUserInfo —— super_admin 数据范围短路', () => {
  const USER = {
    id: 1,
    username: 'admin',
    real_name: '超级管理员',
    department_id: 11,
    first_login: 0,
  };

  /**
   * getUserInfo 的顺序：① sys_user ② sys_role JOIN sys_user_role ③ 权限码聚合。
   * 第 ② 条没有 SELECT id，所以 roleIds 恒为空数组，sys_data_scope 那条查询被跳过。
   */
  const stub = (roleRows: Array<{ role_code: string; data_scope: number }>) => {
    mocks.query
      .mockResolvedValueOnce([USER])
      .mockResolvedValueOnce(roleRows.map((r) => ({ ...r, id: undefined })))
      .mockResolvedValueOnce([]);
  };

  it('持有 super_admin 的角色即使同时挂着 sales(5)，数据范围仍是 all', async () => {
    stub([
      { role_code: 'sales', data_scope: 5 },
      { role_code: 'super_admin', data_scope: 1 },
    ]);

    const info = await getUserInfo(1);
    expect(info?.dataScope).toEqual({ type: 'all' });
  });

  it('普通多角色组合仍走 resolveDataScope 的取严逻辑', async () => {
    stub([
      { role_code: 'sales', data_scope: 5 },
      { role_code: 'business_manager', data_scope: 2 },
    ]);

    const info = await getUserInfo(1);
    expect(info?.dataScope).toEqual({ type: 'dept', deptIds: [11] });
  });

  it('用户被停用 / 不存在时返回 null', async () => {
    mocks.query.mockResolvedValueOnce([]);
    expect(await getUserInfo(404)).toBeNull();
  });
});
