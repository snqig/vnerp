import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { allocateFIFO, splitMaterial, checkWholeMaterial, enforceFIFO } from '@/lib/warehouse-core';
import {
  autoGenerateRequisition,
  submitOverRequisition,
  submitSupplementaryRequisition,
  issueMaterial,
  createReturn,
} from '@/lib/material-requisition';
import {
  generateReceivable,
  recordReceipt,
  generatePayable,
  recordPayment,
  calculateWorkOrderCost,
} from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 测试用例执行器
interface TestCase {
  name: string;
  module: string;
  fn: () => Promise<{ success: boolean; message: string; data?: any }>;
}

const testCases: TestCase[] = [
  // ====== 仓库管理测试 ======
  {
    name: 'FIFO批次分配',
    module: '仓库管理',
    fn: async () => {
      const result = await allocateFIFO(1, 100);
      return {
        success: result.success,
        message: result.message,
        data: { allocations: result.allocations.length, totalAllocated: result.totalAllocated },
      };
    },
  },
  {
    name: '整料检查',
    module: '仓库管理',
    fn: async () => {
      const result = await checkWholeMaterial('TEST-WHOLE-001');
      return {
        success: true,
        message: result.message,
        data: { isWhole: result.isWhole },
      };
    },
  },
  {
    name: 'FIFO强制校验',
    module: '仓库管理',
    fn: async () => {
      const result = await enforceFIFO(1, 'BATCH-001');
      return {
        success: true,
        message: result.message,
        data: { isValid: result.isValid, needsApproval: result.needsApproval },
      };
    },
  },

  // ====== 物料领用测试 ======
  {
    name: '自动生成领料单',
    module: '物料领用',
    fn: async () => {
      const result = await autoGenerateRequisition(1);
      return {
        success: result.success,
        message: result.message,
        data: { requisitionNo: result.requisitionNo },
      };
    },
  },
  {
    name: '超领申请',
    module: '物料领用',
    fn: async () => {
      const result = await submitOverRequisition(1, 1, 50, '测试超领原因');
      return {
        success: result.success,
        message: result.message,
        data: { requisitionId: result.requisitionId },
      };
    },
  },
  {
    name: '补料申请',
    module: '物料领用',
    fn: async () => {
      const result = await submitSupplementaryRequisition(1, 1, 20, '测试补料原因');
      return {
        success: result.success,
        message: result.message,
        data: { requisitionId: result.requisitionId },
      };
    },
  },

  // ====== 财务管理测试 ======
  {
    name: '生成应收单',
    module: '财务管理',
    fn: async () => {
      const result = await generateReceivable(1, 1, 10000);
      return {
        success: result.success,
        message: result.message,
        data: { receivableNo: result.receivableNo },
      };
    },
  },
  {
    name: '生成应付单',
    module: '财务管理',
    fn: async () => {
      const result = await generatePayable(1, 1, 5000);
      return {
        success: result.success,
        message: result.message,
        data: { payableNo: result.payableNo },
      };
    },
  },
  {
    name: '计算工单成本',
    module: '财务管理',
    fn: async () => {
      const result = await calculateWorkOrderCost(1);
      return {
        success: result.success,
        message: result.message,
        data: result.cost,
      };
    },
  },

  // ====== 系统设置测试 ======
  {
    name: '系统配置读取',
    module: '系统设置',
    fn: async () => {
      const configRows: any = await query(
        `SELECT COUNT(*) as count FROM sys_config WHERE deleted = 0`
      );
      return {
        success: true,
        message: `系统配置记录数: ${configRows[0]?.count || 0}`,
        data: { configCount: configRows[0]?.count || 0 },
      };
    },
  },
];

// 执行所有测试
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { module } = body;

  const results: any[] = [];
  let passed = 0;
  let failed = 0;

  const casesToRun = module ? testCases.filter((c) => c.module === module) : testCases;

  for (const testCase of casesToRun) {
    const startTime = Date.now();
    try {
      const result = await testCase.fn();
      const duration = Date.now() - startTime;

      if (result.success) {
        passed++;
        results.push({
          name: testCase.name,
          module: testCase.module,
          status: 'passed',
          message: result.message,
          data: result.data,
          duration: `${duration}ms`,
        });
      } else {
        failed++;
        results.push({
          name: testCase.name,
          module: testCase.module,
          status: 'failed',
          message: result.message,
          data: result.data,
          duration: `${duration}ms`,
        });
      }
    } catch (error: any) {
      failed++;
      results.push({
        name: testCase.name,
        module: testCase.module,
        status: 'error',
        message: error.message,
        duration: `${Date.now() - startTime}ms`,
      });
    }
  }

  return successResponse(
    {
      summary: {
        total: casesToRun.length,
        passed,
        failed,
        passRate: `${((passed / casesToRun.length) * 100).toFixed(1)}%`,
      },
      results,
    },
    '测试执行完成'
  );
});

// 获取测试模块列表
export const GET = withPermission(async () => {
  const modules = [...new Set(testCases.map((c) => c.module))];
  return successResponse({ modules, totalCases: testCases.length }, '获取测试模块列表成功');
});
