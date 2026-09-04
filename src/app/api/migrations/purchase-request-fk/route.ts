import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
export const GET = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    const results: string[] = [];

    const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
      const cols = await query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if ((cols as DbRow[]).length === 0) {
        await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        results.push(`Added ${table}.${column}`);
      } else {
        results.push(`Already exists: ${table}.${column}`);
      }
    };

    const addIndexIfNotExists = async (table: string, indexName: string, definition: string) => {
      const idx = await query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, indexName]
      );
      if ((idx as DbRow[]).length === 0) {
        await execute(`ALTER TABLE ${table} ADD INDEX ${indexName} (${definition})`);
        results.push(`Added index ${indexName} on ${table}`);
      } else {
        results.push(`Already exists: index ${indexName} on ${table}`);
      }
    };

    await addColumnIfNotExists(
      'pur_request',
      'request_dept_id',
      ts('k_60cvy5')
    );
    await addColumnIfNotExists(
      'pur_request',
      'requester_id',
      ts('k_x4gcxi')
    );
    await addColumnIfNotExists(
      'pur_request',
      'reviewer_id',
      ts('k_wcp3xf')
    );
    await addColumnIfNotExists(
      'pur_request',
      'reviewer_name',
      ts('k_19wyrby')
    );
    await addColumnIfNotExists(
      'pur_request',
      'approver_id',
      ts('k_6wy2pr')
    );
    await addColumnIfNotExists(
      'pur_request',
      'approver_name',
      ts('k_14nixxx')
    );

    await addColumnIfNotExists(
      'pur_request_item',
      'material_id',
      ts('k_1mtf411')
    );
    await addIndexIfNotExists('pur_request_item', 'idx_material_id', 'material_id');

    try {
      await execute(
        `UPDATE pur_request pr
       LEFT JOIN sys_department d ON pr.request_dept = d.dept_name
       SET pr.request_dept_id = d.id
       WHERE pr.request_dept_id IS NULL AND pr.request_dept IS NOT NULL AND d.id IS NOT NULL`
      );
      results.push('Backfilled request_dept_id from sys_department');
    } catch (e) {
      results.push(`Backfill request_dept_id skipped: ${(e as Error).message}`);
    }

    try {
      await execute(
        `UPDATE pur_request pr
       LEFT JOIN sys_employee e ON pr.requester_name COLLATE utf8mb4_unicode_ci = e.name COLLATE utf8mb4_unicode_ci
       SET pr.requester_id = e.id
       WHERE pr.requester_id IS NULL AND pr.requester_name IS NOT NULL AND e.id IS NOT NULL`
      );
      results.push('Backfilled requester_id from sys_employee');
    } catch (e) {
      results.push(`Backfill requester_id skipped: ${(e as Error).message}`);
    }

    try {
      await execute(
        `UPDATE pur_request_item pri
       LEFT JOIN inv_material m ON pri.material_name = m.material_name
       SET pri.material_id = m.id
       WHERE pri.material_id IS NULL AND pri.material_name IS NOT NULL AND m.id IS NOT NULL`
      );
      results.push('Backfilled material_id from inv_material');
    } catch (e) {
      results.push(`Backfill material_id skipped: ${(e as Error).message}`);
    }

    return successResponse(results, ts('k_ey185t'));
  },
  { errorMessage: '迁移失败' }
);
