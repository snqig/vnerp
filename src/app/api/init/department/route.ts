import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  parent_id: number;
  sort_order: number;
  status: number;
  create_time?: string;
  update_time?: string;
}

// 一级部门数据
const departmentData = [
  { dept_code: 'DEPT001', dept_name: '管理部', parent_id: 0, sort_order: 1, status: 1 },
  { dept_code: 'DEPT002', dept_name: '业务部', parent_id: 0, sort_order: 2, status: 1 },
  { dept_code: 'DEPT003', dept_name: '生产部', parent_id: 0, sort_order: 3, status: 1 },
  { dept_code: 'DEPT004', dept_name: '打样中心', parent_id: 0, sort_order: 4, status: 1 },
  { dept_code: 'DEPT005', dept_name: '采购部', parent_id: 0, sort_order: 5, status: 1 },
  { dept_code: 'DEPT006', dept_name: '品质部', parent_id: 0, sort_order: 6, status: 1 },
];

// 子部门数据
const subDepartmentData = [
  // 生产部子部门
  { dept_code: 'DEPT00301', dept_name: '模切', parent_code: 'DEPT003', sort_order: 1, status: 1 },
  { dept_code: 'DEPT00302', dept_name: '商标', parent_code: 'DEPT003', sort_order: 2, status: 1 },
  { dept_code: 'DEPT00303', dept_name: '其他', parent_code: 'DEPT003', sort_order: 3, status: 1 },
  // 采购部子部门
  { dept_code: 'DEPT00501', dept_name: '采购', parent_code: 'DEPT005', sort_order: 1, status: 1 },
  { dept_code: 'DEPT00502', dept_name: '仓库', parent_code: 'DEPT005', sort_order: 2, status: 1 },
];

// POST - 初始化部门数据
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 使用事务初始化数据
  await transaction(async (connection) => {
    // 清空现有部门数据
    await connection.execute('DELETE FROM sys_department');

    // 重置自增ID
    await connection.execute('ALTER TABLE sys_department AUTO_INCREMENT = 1');

    // 插入一级部门
    for (const dept of departmentData) {
      await connection.execute(
        'INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
        [dept.dept_code, dept.dept_name, dept.parent_id, dept.sort_order, dept.status]
      );
    }

    // 获取刚插入的部门ID映射
    const [allDepts] = await connection.execute(
      'SELECT id, dept_code FROM sys_department'
    ) as [any[], any];
    const codeToIdMap = new Map(allDepts.map((d: any) => [d.dept_code, d.id]));

    // 插入子部门
    for (const sub of subDepartmentData) {
      const parentId = codeToIdMap.get(sub.parent_code) || 0;
      await connection.execute(
        'INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
        [sub.dept_code, sub.dept_name, parentId, sub.sort_order, sub.status]
      );
    }
  });

  // 获取最终数据
  const finalDepts = await query<Department>(
    'SELECT * FROM sys_department ORDER BY parent_id, sort_order'
  );

  // 构建部门树结构
  const buildTree = (departments: Department[], parentId: number = 0): any[] => {
    return departments
      .filter((d) => d.parent_id === parentId)
      .map((d) => ({
        ...d,
        children: buildTree(departments, d.id),
      }));
  };

  const treeData = buildTree(finalDepts);

  return successResponse(
    {
      list: finalDepts,
      tree: treeData,
      count: finalDepts.length,
      level1Count: departmentData.length,
      level2Count: subDepartmentData.length,
    },
    '部门数据初始化成功'
  );
}, '初始化部门数据失败');

// GET - 获取当前部门数据
export const GET = withErrorHandler(async (request: NextRequest) => {
  const depts = await query<Department>(
    'SELECT * FROM sys_department ORDER BY parent_id, sort_order'
  );

  // 构建部门树结构
  const buildTree = (departments: Department[], parentId: number = 0): any[] => {
    return departments
      .filter((d) => d.parent_id === parentId)
      .map((d) => ({
        ...d,
        children: buildTree(departments, d.id),
      }));
  };

  const treeData = buildTree(depts);

  // 统计信息
  const stats = {
    total: depts.length,
    level1: depts.filter((d) => d.parent_id === 0).length,
    level2: depts.filter((d) => d.parent_id !== 0).length,
    active: depts.filter((d) => d.status === 1).length,
  };

  return successResponse({
    list: depts,
    tree: treeData,
    stats,
  });
}, '获取部门数据失败');
