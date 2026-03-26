import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 新的部门架构数据 - 一级部门
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

export async function POST(request: NextRequest) {
  try {
    // 清空现有部门数据
    await query('DELETE FROM sys_department');
    
    // 重置自增ID
    await query('ALTER TABLE sys_department AUTO_INCREMENT = 1');
    
    // 插入一级部门
    for (const dept of departmentData) {
      await query(
        'INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
        [dept.dept_code, dept.dept_name, dept.parent_id, dept.sort_order, dept.status]
      );
    }
    
    // 获取刚插入的部门ID映射
    const allDepts = await query('SELECT id, dept_code FROM sys_department');
    const codeToIdMap = new Map(allDepts.map((d: any) => [d.dept_code, d.id]));
    
    // 插入子部门
    for (const sub of subDepartmentData) {
      const parentId = codeToIdMap.get(sub.parent_code) || 0;
      await query(
        'INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
        [sub.dept_code, sub.dept_name, parentId, sub.sort_order, sub.status]
      );
    }
    
    // 获取最终数据
    const finalDepts = await query('SELECT * FROM sys_department ORDER BY parent_id, sort_order');
    
    return NextResponse.json({
      success: true,
      message: '部门数据初始化成功',
      data: finalDepts,
      count: finalDepts.length
    });
  } catch (error) {
    console.error('初始化部门数据失败:', error);
    return NextResponse.json({
      success: false,
      message: '初始化部门数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

// 获取当前部门数据
export async function GET(request: NextRequest) {
  try {
    const depts = await query('SELECT * FROM sys_department ORDER BY parent_id, sort_order');
    return NextResponse.json({
      success: true,
      data: depts,
      count: depts.length
    });
  } catch (error) {
    console.error('获取部门数据失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取部门数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
