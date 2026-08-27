/**
 * 印前模块 - 油墨配方版本迭代 E2E 测试
 *
 * 覆盖链路：创建草稿 → 生效 → 作废 → 一键复用生成新版本
 * 测试用例: TC-FORMULA-001 ~ TC-FORMULA-006
 *
 * 策略：
 *   - 通过 UI 登录获取鉴权 Cookie
 *   - 使用 page.request 调用业务 API 驱动状态流转
 *   - 通过 API 响应与页面导航验证关键数据
 */

import { test, expect, type Page, type APIResponse } from '@playwright/test';

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

/** 测试用色号 ID — 若环境无此色号，相关用例将安全跳过 */
const TEST_COLOR_ID = Number(process.env.E2E_FORMULA_COLOR_ID || 1);
/** 测试用物料 ID — 配方明细使用 */
const TEST_MATERIAL_ID = Number(process.env.E2E_FORMULA_MATERIAL_ID || 1);

async function login(page: Page): Promise<void> {
  // 重置登录锁定状态（与 global-setup 一致）
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

/** 解析 API 响应体 */
async function parseJson(resp: APIResponse): Promise<Loose> {
  const body = await resp.json();
  return body as Loose;
}

/** 构造草稿版本请求体 */
function buildDraftVersionBody(colorId: number, materialId: number) {
  return {
    color_id: colorId,
    items: [
      {
        material_id: materialId,
        material_code: `M-${materialId}`,
        material_name: `E2E测试物料-${materialId}`,
        quantity: 100,
        unit: 'g',
        unit_cost: 0.5,
      },
    ],
    remark: 'E2E自动化测试-草稿版本',
  };
}

test.describe('印前模块：油墨配方版本迭代', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * TC-FORMULA-001: 创建草稿版本
   */
  test('TC-FORMULA-001: 创建草稿版本成功', async ({ page }) => {
    const resp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });

    const body = await parseJson(resp);
    expect(resp.ok(), `API 应返回 2xx，实际: ${resp.status()} ${JSON.stringify(body)}`).toBeTruthy();

    expect(body.success).toBe(true);
    expect(body.data).toBeTruthy();
    expect(body.data.id).toBeTruthy();

    // 验证：通过 GET 详情接口确认草稿状态
    const detailResp = await page.request.get(
      `/api/dcprint/formula/version?id=${body.data.id}`
    );
    const detailBody = await parseJson(detailResp);
    expect(detailResp.ok()).toBeTruthy();
    expect(detailBody.data).toBeTruthy();
    // 草稿版本 status 应为 draft
    expect(['draft', 'DRAFT', 0, '0']).toContain(detailBody.data.status);
  });

  /**
   * TC-FORMULA-002: 版本生效
   *    依赖 TC-FORMULA-001 创建的草稿版本，故在同一用例中串联。
   */
  test('TC-FORMULA-002: 草稿版本生效后状态变为 active', async ({ page }) => {
    // 1. 先创建草稿版本
    const createResp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建草稿版本');
    const versionId = createBody.data.id;

    // 2. 调用生效接口
    const activateResp = await page.request.post(
      `/api/dcprint/formula/version/${versionId}/activate`
    );
    const activateBody = await parseJson(activateResp);
    expect(
      activateResp.ok(),
      `生效失败: ${activateResp.status()} ${JSON.stringify(activateBody)}`
    ).toBeTruthy();
    expect(activateBody.success).toBe(true);

    // 3. 验证状态已变为 active
    const detailResp = await page.request.get(
      `/api/dcprint/formula/version?id=${versionId}`
    );
    const detailBody = await parseJson(detailResp);
    expect(detailResp.ok()).toBeTruthy();
    expect(['active', 'ACTIVE', 1, '1']).toContain(detailBody.data.status);
  });

  /**
   * TC-FORMULA-003: 版本作废
   */
  test('TC-FORMULA-003: 草稿版本作废后状态变为 cancelled', async ({ page }) => {
    // 1. 创建草稿版本
    const createResp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建草稿版本');
    const versionId = createBody.data.id;

    // 2. 作废
    const cancelResp = await page.request.post(
      `/api/dcprint/formula/version/${versionId}/cancel`,
      { data: { reason: 'E2E自动化测试-作废' } }
    );
    const cancelBody = await parseJson(cancelResp);
    expect(
      cancelResp.ok(),
      `作废失败: ${cancelResp.status()} ${JSON.stringify(cancelBody)}`
    ).toBeTruthy();
    expect(cancelBody.success).toBe(true);

    // 3. 验证状态
    const detailResp = await page.request.get(
      `/api/dcprint/formula/version?id=${versionId}`
    );
    const detailBody = await parseJson(detailResp);
    expect(detailResp.ok()).toBeTruthy();
    expect(['cancelled', 'CANCELLED', 3, '3']).toContain(detailBody.data.status);
  });

  /**
   * TC-FORMULA-004: 一键复用生成新版本
   *    以一个已生效或已作废的版本为模板，复制生成新的草稿版本。
   */
  test('TC-FORMULA-004: 一键复用已生效版本生成新草稿', async ({ page }) => {
    // 1. 创建并生效一个版本作为复用源
    const createResp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建草稿版本');
    const sourceId = createBody.data.id;

    const activateResp = await page.request.post(
      `/api/dcprint/formula/version/${sourceId}/activate`
    );
    test.skip(!activateResp.ok(), '前置条件失败：无法生效版本');

    // 2. 一键复用
    const duplicateResp = await page.request.post(
      `/api/dcprint/formula/version/${sourceId}/duplicate`,
      { data: { remark: 'E2E自动化测试-一键复用' } }
    );
    const dupBody = await parseJson(duplicateResp);
    expect(
      duplicateResp.ok(),
      `复用失败: ${duplicateResp.status()} ${JSON.stringify(dupBody)}`
    ).toBeTruthy();
    expect(dupBody.success).toBe(true);
    expect(dupBody.data.id).toBeTruthy();
    expect(dupBody.data.id).not.toBe(sourceId);

    // 3. 验证新版本为草稿状态
    const detailResp = await page.request.get(
      `/api/dcprint/formula/version?id=${dupBody.data.id}`
    );
    const detailBody = await parseJson(detailResp);
    expect(detailResp.ok()).toBeTruthy();
    expect(['draft', 'DRAFT', 0, '0']).toContain(detailBody.data.status);
  });

  /**
   * TC-FORMULA-005: 完整迭代链路（草稿→生效→作废→复用）
   *    端到端串联全部状态流转，验证业务闭环。
   */
  test('TC-FORMULA-005: 完整迭代链路 草稿→生效→作废→复用', async ({ page }) => {
    // Step 1: 创建草稿
    const createResp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建草稿版本');
    const v1Id = createBody.data.id;

    const detail1 = await parseJson(
      await page.request.get(`/api/dcprint/formula/version?id=${v1Id}`)
    );
    expect(['draft', 'DRAFT', 0, '0']).toContain(detail1.data.status);

    // Step 2: 生效
    const activateResp = await page.request.post(
      `/api/dcprint/formula/version/${v1Id}/activate`
    );
    expect(activateResp.ok(), 'Step2 生效失败').toBeTruthy();

    const detail2 = await parseJson(
      await page.request.get(`/api/dcprint/formula/version?id=${v1Id}`)
    );
    expect(['active', 'ACTIVE', 1, '1']).toContain(detail2.data.status);

    // Step 3: 作废
    const cancelResp = await page.request.post(
      `/api/dcprint/formula/version/${v1Id}/cancel`,
      { data: { reason: 'E2E完整链路-作废' } }
    );
    expect(cancelResp.ok(), 'Step3 作废失败').toBeTruthy();

    const detail3 = await parseJson(
      await page.request.get(`/api/dcprint/formula/version?id=${v1Id}`)
    );
    expect(['cancelled', 'CANCELLED', 3, '3']).toContain(detail3.data.status);

    // Step 4: 一键复用生成新版本
    const dupResp = await page.request.post(
      `/api/dcprint/formula/version/${v1Id}/duplicate`,
      { data: { remark: 'E2E完整链路-复用' } }
    );
    const dupBody = await parseJson(dupResp);
    expect(dupResp.ok(), 'Step4 复用失败').toBeTruthy();
    expect(dupBody.data.id).not.toBe(v1Id);

    const detail4 = await parseJson(
      await page.request.get(`/api/dcprint/formula/version?id=${dupBody.data.id}`)
    );
    expect(['draft', 'DRAFT', 0, '0']).toContain(detail4.data.status);

    // Step 5: 新版本可再次生效（形成版本迭代闭环）
    const reActivateResp = await page.request.post(
      `/api/dcprint/formula/version/${dupBody.data.id}/activate`
    );
    expect(reActivateResp.ok(), 'Step5 新版本生效失败').toBeTruthy();
  });

  /**
   * TC-FORMULA-006: 版本列表查询与历史版本归档
   *    生效新版本后，旧 active 版本应自动归档。
   */
  test('TC-FORMULA-006: 生效新版本时旧版本自动归档', async ({ page }) => {
    // 1. 查询当前色号下的版本列表
    const listResp = await page.request.get(
      `/api/dcprint/formula/version?colorId=${TEST_COLOR_ID}`
    );
    const listBody = await parseJson(listResp);
    expect(listResp.ok()).toBeTruthy();

    const beforeList = listBody.data?.list || [];
    const beforeActiveCount = beforeList.filter(
      (v: Loose) => v.status === 'active' || v.status === 'ACTIVE' || v.status === 1
    ).length;

    // 2. 创建并生效一个新版本
    const createResp = await page.request.post('/api/dcprint/formula/version', {
      data: buildDraftVersionBody(TEST_COLOR_ID, TEST_MATERIAL_ID),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建草稿版本');

    const activateResp = await page.request.post(
      `/api/dcprint/formula/version/${createBody.data.id}/activate`
    );
    expect(activateResp.ok(), '生效失败').toBeTruthy();

    // 3. 重新查询列表，验证 active 版本数仍为 1（旧版本已归档）
    const listAfterResp = await page.request.get(
      `/api/dcprint/formula/version?colorId=${TEST_COLOR_ID}`
    );
    const listAfterBody = await parseJson(listAfterResp);
    const afterList = listAfterBody.data?.list || [];
    const afterActiveCount = afterList.filter(
      (v: Loose) => v.status === 'active' || v.status === 'ACTIVE' || v.status === 1
    ).length;

    // 同一色号下只能有一个 active 版本
    expect(afterActiveCount).toBe(1);
    // 如果之前已有 active 版本，旧版本应已变为 archived
    if (beforeActiveCount === 1) {
      const archivedCount = afterList.filter(
        (v: Loose) => v.status === 'archived' || v.status === 'ARCHIVED' || v.status === 2
      ).length;
      expect(archivedCount).toBeGreaterThanOrEqual(1);
    }
  });
});
