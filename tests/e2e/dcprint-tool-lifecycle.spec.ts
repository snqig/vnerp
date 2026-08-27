/**
 * 印前模块 - 工装寿命全周期 E2E 测试
 *
 * 覆盖链路：新建工装 → 激活 → 使用累计次数 → 触发预警 → 报废
 * 测试用例: TC-TOOL-001 ~ TC-TOOL-007
 *
 * 工装状态机：STANDBY(1) → ACTIVE(2) → WARNING(4) → SCRAPPED(5)
 *
 * 策略：
 *   - 通过 UI 登录获取鉴权 Cookie
 *   - 使用 page.request 调用工装管理 API 驱动状态流转
 *   - 通过 API 响应验证状态与累计次数
 */

import { test, expect, type Page, type APIResponse } from '@playwright/test';

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

/** 工装状态枚举（与 ToolStatus.ts 对齐） */
const TOOL_STATUS = {
  STANDBY: 1,
  ACTIVE: 2,
  MAINTENANCE: 3,
  WARNING: 4,
  SCRAPPED: 5,
} as const;

/** 工装类型：1=网版 2=刀模 3=其他 */
const TOOL_TYPE = 1;

async function login(page: Page): Promise<void> {
  await fetch('/api/auth/reset-lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin' }),
  }).catch(() => {});

  await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input#username', { timeout: 60000 });
  await page.fill('input#username', TEST_USER.username);
  await page.fill('input#password', TEST_USER.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/en/dashboard', { timeout: 60000 });
  await page.waitForTimeout(1500);
}

async function parseJson(resp: APIResponse): Promise<Loose> {
  return (await resp.json()) as Loose;
}

/** 创建工装请求体 — totalLife 设小值便于测试预警/报废 */
function buildToolBody(suffix: string, totalLife: number, warningThreshold: number) {
  return {
    toolType: TOOL_TYPE,
    toolCode: `E2E-TOOL-${suffix}-${Date.now().toString(36)}`,
    toolName: `E2E测试工装-${suffix}`,
    spec: '300mm×400mm',
    totalLife,
    warningThreshold,
    originalCost: 500,
    manufactureDate: new Date().toISOString().slice(0, 10),
    piecesPerImpression: 1,
    material: '铝合金',
    remark: 'E2E自动化测试工装',
  };
}

/** 获取工装详情 */
async function getToolDetail(page: Page, toolId: number): Promise<Loose> {
  const resp = await page.request.get(`/api/dcprint/tool/${toolId}`);
  const body = await parseJson(resp);
  return body.data || {};
}

test.describe('印前模块：工装寿命全周期', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * TC-TOOL-001: 新建工装
   *    新建后状态应为 STANDBY(1)，已用次数为 0。
   */
  test('TC-TOOL-001: 新建工装成功，初始状态为待用', async ({ page }) => {
    const resp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('001', 1000, 800),
    });
    const body = await parseJson(resp);
    expect(resp.ok(), `创建失败: ${resp.status()} ${JSON.stringify(body)}`).toBeTruthy();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();

    const detail = await getToolDetail(page, body.data.id);
    // 新建工装状态应为 STANDBY(1)
    expect(Number(detail.status)).toBe(TOOL_STATUS.STANDBY);
    // 已用次数为 0
    expect(Number(detail.used_count || 0)).toBe(0);
    // 剩余寿命应等于总寿命
    expect(Number(detail.remain_life || detail.remaining_life || 0)).toBe(1000);
  });

  /**
   * TC-TOOL-002: 激活工装
   *    STANDBY → ACTIVE
   */
  test('TC-TOOL-002: 待用工装激活后状态变为在用', async ({ page }) => {
    // 1. 创建工装
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('002', 1000, 800),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    // 2. 激活
    const activateResp = await page.request.post(`/api/dcprint/tool/${toolId}/activate`);
    const activateBody = await parseJson(activateResp);
    expect(
      activateResp.ok(),
      `激活失败: ${activateResp.status()} ${JSON.stringify(activateBody)}`
    ).toBeTruthy();

    // 3. 验证状态
    const detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.ACTIVE);
  });

  /**
   * TC-TOOL-003: 使用累计次数
   *    记录多次使用后，used_count 应累加，remain_life 应递减。
   */
  test('TC-TOOL-003: 多次使用后累计次数正确递增', async ({ page }) => {
    // 1. 创建并激活工装（总寿命 1000，预警阈值 800）
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('003', 1000, 800),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    await page.request.post(`/api/dcprint/tool/${toolId}/activate`);

    // 2. 第一次使用 100 次
    const use1Resp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 100, processName: 'E2E测试工序-1' },
    });
    expect(use1Resp.ok(), '第一次使用记录失败').toBeTruthy();

    let detail = await getToolDetail(page, toolId);
    expect(Number(detail.used_count)).toBe(100);
    expect(Number(detail.remain_life || detail.remaining_life)).toBe(900);

    // 3. 第二次使用 200 次
    const use2Resp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 200, processName: 'E2E测试工序-2' },
    });
    expect(use2Resp.ok(), '第二次使用记录失败').toBeTruthy();

    detail = await getToolDetail(page, toolId);
    expect(Number(detail.used_count)).toBe(300);
    expect(Number(detail.remain_life || detail.remaining_life)).toBe(700);

    // 4. 验证使用记录列表
    const usageListResp = await page.request.get(`/api/dcprint/tool/${toolId}/usage`);
    const usageListBody = await parseJson(usageListResp);
    expect(usageListResp.ok()).toBeTruthy();
    const usageRecords = usageListBody.data?.list || [];
    expect(usageRecords.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * TC-TOOL-004: 触发预警
   *    使用次数超过预警阈值后，状态应变为 WARNING(4)。
   */
  test('TC-TOOL-004: 使用次数超过阈值触发预警状态', async ({ page }) => {
    // 1. 创建并激活工装（总寿命 1000，预警阈值 300 — 设低值便于测试）
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('004', 1000, 300),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    await page.request.post(`/api/dcprint/tool/${toolId}/activate`);

    // 2. 使用 350 次（超过预警阈值 300）
    const useResp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 350, processName: 'E2E预警测试' },
    });
    expect(useResp.ok(), '使用记录失败').toBeTruthy();

    // 3. 验证状态变为 WARNING(4)
    const detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.WARNING);
    expect(Number(detail.used_count)).toBe(350);
  });

  /**
   * TC-TOOL-005: 报废
   *    任一状态的工装都应支持报废操作，报废后状态为 SCRAPPED(5)。
   */
  test('TC-TOOL-005: 工装报废后状态变为已报废', async ({ page }) => {
    // 1. 创建并激活工装
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('005', 1000, 800),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    await page.request.post(`/api/dcprint/tool/${toolId}/activate`);

    // 2. 报废
    const scrapResp = await page.request.post(`/api/dcprint/tool/${toolId}/scrap`, {
      data: { scrapReason: 'E2E自动化测试-报废' },
    });
    const scrapBody = await parseJson(scrapResp);
    expect(
      scrapResp.ok(),
      `报废失败: ${scrapResp.status()} ${JSON.stringify(scrapBody)}`
    ).toBeTruthy();

    // 3. 验证状态
    const detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.SCRAPPED);
  });

  /**
   * TC-TOOL-006: 完整寿命周期链路
   *    新建 → 激活 → 多次使用 → 预警 → 继续使用至寿命耗尽 → 报废
   */
  test('TC-TOOL-006: 完整寿命周期 新建→激活→使用→预警→报废', async ({ page }) => {
    // Step 1: 新建工装（总寿命 500，预警阈值 300）
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('006', 500, 300),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    let detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.STANDBY);

    // Step 2: 激活
    const activateResp = await page.request.post(`/api/dcprint/tool/${toolId}/activate`);
    expect(activateResp.ok(), 'Step2 激活失败').toBeTruthy();
    detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.ACTIVE);

    // Step 3: 使用 200 次（未达预警）
    const use1Resp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 200, processName: 'E2E周期-正常使用' },
    });
    expect(use1Resp.ok(), 'Step3 使用失败').toBeTruthy();
    detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.ACTIVE);
    expect(Number(detail.used_count)).toBe(200);

    // Step 4: 使用 150 次（累计 350，超过预警阈值 300 → WARNING）
    const use2Resp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 150, processName: 'E2E周期-触发预警' },
    });
    expect(use2Resp.ok(), 'Step4 使用失败').toBeTruthy();
    detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.WARNING);
    expect(Number(detail.used_count)).toBe(350);

    // Step 5: 报废
    const scrapResp = await page.request.post(`/api/dcprint/tool/${toolId}/scrap`, {
      data: { scrapReason: 'E2E周期-寿命耗尽报废' },
    });
    expect(scrapResp.ok(), 'Step5 报废失败').toBeTruthy();
    detail = await getToolDetail(page, toolId);
    expect(Number(detail.status)).toBe(TOOL_STATUS.SCRAPPED);
  });

  /**
   * TC-TOOL-007: 已报废工装不能再使用
   *    验证状态机约束：SCRAPPED 是终态。
   */
  test('TC-TOOL-007: 已报废工装拒绝再记录使用', async ({ page }) => {
    // 1. 创建并报废工装
    const createResp = await page.request.post('/api/dcprint/tool', {
      data: buildToolBody('007', 1000, 800),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建工装');
    const toolId = createBody.data.id;

    await page.request.post(`/api/dcprint/tool/${toolId}/activate`);
    await page.request.post(`/api/dcprint/tool/${toolId}/scrap`, {
      data: { scrapReason: 'E2E约束测试-先报废' },
    });

    // 2. 尝试再次使用 — 应失败
    const useResp = await page.request.post(`/api/dcprint/tool/${toolId}/usage`, {
      data: { useCount: 10, processName: 'E2E约束测试-报废后使用' },
    });
    expect(useResp.ok(), '已报废工装不应允许记录使用').toBeFalsy();
  });
});
