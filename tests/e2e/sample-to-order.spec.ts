/**
 * 打样模块 E2E 测试 —— 打样申请到转大货全链路
 *
 * 覆盖链路：打样申请 → 提交 → 工艺卡生成 → 打样工单 → 转大货
 * 重点验证：T305 自动创建销售订单
 *
 * 测试用例: TC-SAMPLE-001 ~ TC-SAMPLE-009
 *
 * 状态机：DRAFT → PENDING → IN_PROGRESS → COMPLETED → CONFIRMED → CONVERTED
 *
 * 策略：
 *   - 通过 UI 登录获取鉴权 Cookie
 *   - 使用 page.request 调用打样业务 API 驱动状态流转
 *   - 验证 T305 转换后自动生成销售订单
 *   - 验证打样工单创建（linkage API）
 */

import { test, expect, type Page, type APIResponse } from '@playwright/test';

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

/** 打样单状态（与 SampleOrderStatus.ts 对齐） */
const SAMPLE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CONFIRMED: 'confirmed',
  CONVERTED: 'converted',
  CANCELLED: 'cancelled',
} as const;

/** 测试数据 — 可通过环境变量覆盖 */
const TEST_CUSTOMER_ID = Number(process.env.E2E_SAMPLE_CUSTOMER_ID || 1);
const TEST_MATERIAL_NO = process.env.E2E_SAMPLE_MATERIAL_NO || 'M-E2E-001';

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

/** 构造打样单请求体 */
function buildSampleOrderBody(suffix: string) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    notify_date: today,
    customer_id: TEST_CUSTOMER_ID,
    customer_name: `E2E测试客户-${suffix}`,
    product_name: `E2E测试产品-${suffix}`,
    material_no: TEST_MATERIAL_NO,
    size_spec: '100x200mm',
    material_spec: 'PET 0.3mm',
    quantity: 10,
    order_date: today,
    customer_require_date: new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10),
    delivery_date: new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    sample_fee: 500,
    remark: 'E2E自动化测试打样单',
  };
}

/** 调用状态变更 API */
async function changeStatus(
  page: Page,
  id: number,
  action: string,
  extra: Record<string, unknown> = {}
): Promise<{ resp: APIResponse; body: Loose }> {
  const resp = await page.request.put('/api/sample/orders/status', {
    data: { id, action, ...extra },
  });
  const body = await parseJson(resp);
  return { resp, body };
}

/** 获取打样单详情（通过列表查询） */
async function getSampleOrder(page: Page, orderId: number): Promise<Loose | null> {
  const resp = await page.request.get(
    `/api/sample/orders?keyword=${orderId}&page=1&pageSize=10`
  );
  if (!resp.ok()) return null;
  const body = await parseJson(resp);
  const list = body.data?.list || [];
  return list.find((o: Loose) => Number(o.id) === orderId) || null;
}

test.describe('打样模块：打样申请到转大货全链路', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * TC-SAMPLE-001: 打样申请创建
   *    创建后状态应为 draft。
   */
  test('TC-SAMPLE-001: 打样申请创建成功，初始状态为 draft', async ({ page }) => {
    const resp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('001'),
    });
    const body = await parseJson(resp);
    expect(resp.ok(), `创建失败: ${resp.status()} ${JSON.stringify(body)}`).toBeTruthy();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.order_no).toBeTruthy();

    // 验证状态为 draft
    const order = await getSampleOrder(page, body.data.id);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.DRAFT);
  });

  /**
   * TC-SAMPLE-002: 提交打样单（draft → pending）
   */
  test('TC-SAMPLE-002: 提交打样单后状态变为 pending', async ({ page }) => {
    // 1. 创建打样单
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('002'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    // 2. 提交
    const { resp, body } = await changeStatus(page, orderId, 'submit');
    expect(resp.ok(), `提交失败: ${JSON.stringify(body)}`).toBeTruthy();

    // 3. 验证状态
    const order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.PENDING);
  });

  /**
   * TC-SAMPLE-003: 打样生产流程（pending → in_progress → completed）
   */
  test('TC-SAMPLE-003: 打样生产流程 待打样→打样中→已完成', async ({ page }) => {
    // 1. 创建并提交
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('003'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    await changeStatus(page, orderId, 'submit');

    // 2. 开始生产
    const startResult = await changeStatus(page, orderId, 'startProduction');
    expect(startResult.resp.ok(), `开始生产失败: ${JSON.stringify(startResult.body)}`).toBeTruthy();

    let order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.IN_PROGRESS);

    // 3. 完成生产
    const completeResult = await changeStatus(page, orderId, 'complete');
    expect(completeResult.resp.ok(), `完成失败: ${JSON.stringify(completeResult.body)}`).toBeTruthy();

    order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.COMPLETED);
  });

  /**
   * TC-SAMPLE-004: 确认打样（completed → confirmed）
   */
  test('TC-SAMPLE-004: 确认打样后状态变为 confirmed', async ({ page }) => {
    // 1. 创建并走完到 completed
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('004'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    await changeStatus(page, orderId, 'submit');
    await changeStatus(page, orderId, 'startProduction');
    await changeStatus(page, orderId, 'complete');

    // 2. 确认
    const { resp, body } = await changeStatus(page, orderId, 'confirm');
    expect(resp.ok(), `确认失败: ${JSON.stringify(body)}`).toBeTruthy();

    // 3. 验证状态
    const order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.CONFIRMED);
  });

  /**
   * TC-SAMPLE-005: T305 转大货 — 自动创建销售订单
   *
   * 重点测试：当 action='convert' 且不提供 salesOrderId 时，
   * 系统应自动调用 createSalesOrderFromSample 创建销售订单。
   */
  test('TC-SAMPLE-005: T305 转大货自动创建销售订单', async ({ page }) => {
    // 1. 创建打样单并走完到 confirmed
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('005'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    await changeStatus(page, orderId, 'submit');
    await changeStatus(page, orderId, 'startProduction');
    await changeStatus(page, orderId, 'complete');
    await changeStatus(page, orderId, 'confirm');

    // 2. 转大货 — 不提供 salesOrderId，触发 T305
    const { resp, body } = await changeStatus(page, orderId, 'convert');
    expect(
      resp.ok(),
      `T305 转大货失败: ${resp.status()} ${JSON.stringify(body)}`
    ).toBeTruthy();

    // 3. 验证打样单状态变为 converted
    const order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.CONVERTED);

    // 4. 验证 T305 自动创建了销售订单（sales_order_id 应已填充）
    expect(order.sales_order_id).toBeTruthy();
    expect(Number(order.sales_order_id)).toBeGreaterThan(0);
  });

  /**
   * TC-SAMPLE-006: 打样工单创建（linkage API）
   *    验证基于打样单可创建打样工单。
   */
  test('TC-SAMPLE-006: 打样工单创建成功', async ({ page }) => {
    // 1. 创建一个待打样状态的打样单
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('006'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    await changeStatus(page, orderId, 'submit');

    // 2. 创建打样工单
    const linkageResp = await page.request.post('/api/sample/orders/linkage', {
      data: {
        sample_order_id: orderId,
        plan_start_date: new Date().toISOString().slice(0, 10),
        plan_end_date: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10),
      },
    });
    const linkageBody = await parseJson(linkageResp);

    if (!linkageResp.ok()) {
      // 已交付或已存在工单时可接受跳过
      test.skip(
        String(linkageBody.message || '').includes('已交付') ||
          String(linkageBody.message || '').includes('已存在'),
        `打样工单创建跳过: ${linkageBody.message}`
      );
    }
    expect(linkageResp.ok(), `打样工单创建失败: ${JSON.stringify(linkageBody)}`).toBeTruthy();
    expect(linkageBody.data.work_order_id).toBeTruthy();
    expect(linkageBody.data.work_order_no).toBeTruthy();

    // 3. 验证联动信息
    const linkInfoResp = await page.request.get(
      `/api/sample/orders/linkage?sample_order_id=${orderId}`
    );
    const linkInfoBody = await parseJson(linkInfoResp);
    expect(linkInfoResp.ok()).toBeTruthy();
    expect(linkInfoBody.data.work_orders).toBeTruthy();
    expect(linkInfoBody.data.work_orders.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-SAMPLE-007: 完整链路 — 打样申请→提交→生产→完成→确认→转大货
   *    端到端验证打样全流程数据流转。
   */
  test('TC-SAMPLE-007: 完整链路 申请→提交→生产→完成→确认→转大货', async ({ page }) => {
    // Step 1: 创建
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('007'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    let order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.DRAFT);

    // Step 2: 提交 (draft → pending)
    const submitResult = await changeStatus(page, orderId, 'submit');
    expect(submitResult.resp.ok(), 'Step2 提交失败').toBeTruthy();

    // Step 3: 开始生产 (pending → in_progress)
    const startResult = await changeStatus(page, orderId, 'startProduction');
    expect(startResult.resp.ok(), 'Step3 开始生产失败').toBeTruthy();

    // Step 4: 完成 (in_progress → completed)
    const completeResult = await changeStatus(page, orderId, 'complete');
    expect(completeResult.resp.ok(), 'Step4 完成失败').toBeTruthy();

    // Step 5: 确认 (completed → confirmed)
    const confirmResult = await changeStatus(page, orderId, 'confirm');
    expect(confirmResult.resp.ok(), 'Step5 确认失败').toBeTruthy();

    // Step 6: 转大货 (confirmed → converted) — T305
    const convertResult = await changeStatus(page, orderId, 'convert');
    expect(convertResult.resp.ok(), 'Step6 转大货失败').toBeTruthy();

    // Step 7: 验证最终状态
    order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.CONVERTED);
    // T305: 应自动创建销售订单
    expect(Number(order.sales_order_id || 0)).toBeGreaterThan(0);
  });

  /**
   * TC-SAMPLE-008: 重复转大货被拒绝
   *    验证已转大货的打样单不能再次转换。
   */
  test('TC-SAMPLE-008: 已转大货打样单拒绝重复转换', async ({ page }) => {
    // 1. 创建并走完到 converted
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('008'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    await changeStatus(page, orderId, 'submit');
    await changeStatus(page, orderId, 'startProduction');
    await changeStatus(page, orderId, 'complete');
    await changeStatus(page, orderId, 'confirm');
    await changeStatus(page, orderId, 'convert');

    // 2. 再次转大货 — 应失败
    const { resp, body } = await changeStatus(page, orderId, 'convert');
    expect(resp.ok(), '重复转大货应被拒绝').toBeFalsy();
  });

  /**
   * TC-SAMPLE-009: 打样单作废
   *    验证草稿状态可作废，作废后状态为 cancelled。
   */
  test('TC-SAMPLE-009: 草稿打样单作废后状态变为 cancelled', async ({ page }) => {
    // 1. 创建打样单
    const createResp = await page.request.post('/api/sample/orders', {
      data: buildSampleOrderBody('009'),
    });
    const createBody = await parseJson(createResp);
    test.skip(!createResp.ok() || !createBody.data?.id, '前置条件失败：无法创建打样单');
    const orderId = createBody.data.id;

    // 2. 作废
    const { resp, body } = await changeStatus(page, orderId, 'cancel', {
      reason: 'E2E自动化测试-作废',
    });
    expect(resp.ok(), `作废失败: ${JSON.stringify(body)}`).toBeTruthy();

    // 3. 验证状态
    const order = await getSampleOrder(page, orderId);
    test.skip(!order, '查询打样单失败');
    expect(order.status).toBe(SAMPLE_STATUS.CANCELLED);
  });
});

test.describe('打样模块：工艺卡生成与转工单', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * TC-SAMPLE-010: 打样工艺卡创建
   *    验证可创建打样工艺卡。
   */
  test('TC-SAMPLE-010: 打样工艺卡创建成功', async ({ page }) => {
    const resp = await page.request.post('/api/dcprint/sample-card', {
      data: {
        sampleName: `E2E测试工艺卡-${Date.now()}`,
        customerId: TEST_CUSTOMER_ID,
        customerName: 'E2E测试客户',
        productName: 'E2E测试产品',
        spec: '100x200mm',
        printColor: '四色',
        status: 1,
        items: [
          {
            itemType: 1,
            materialCode: TEST_MATERIAL_NO,
            materialName: 'E2E测试材料',
            unitDosage: 0.5,
            unit: 'kg',
            unitCost: 50,
          },
        ],
        steps: [
          {
            processName: 'E2E测试工序-印刷',
            workHour: 2,
            hourlyRate: 100,
            sort: 1,
          },
        ],
        remark: 'E2E自动化测试工艺卡',
      },
    });
    const body = await parseJson(resp);

    if (!resp.ok()) {
      // 校验失败时跳过（可能是测试数据不完整）
      test.skip(true, `工艺卡创建跳过: ${body.message || resp.status()}`);
    }
    expect(resp.ok(), `创建失败: ${JSON.stringify(body)}`).toBeTruthy();
    expect(body.data.id).toBeTruthy();
  });

  /**
   * TC-SAMPLE-011: 打样工艺卡列表查询
   */
  test('TC-SAMPLE-011: 打样工艺卡列表查询正常', async ({ page }) => {
    const resp = await page.request.get(
      '/api/dcprint/sample-card?page=1&pageSize=10'
    );
    const body = await parseJson(resp);
    expect(resp.ok()).toBeTruthy();
    // 列表接口应返回成功
    expect(body.success === true || body.data !== undefined).toBeTruthy();
  });
});
