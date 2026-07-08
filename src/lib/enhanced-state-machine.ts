import { secureLog } from '@/lib/logger';
import { execute } from '@/lib/db';
import { CalcParamService } from '@/lib/calc-param-service';

export type InspectStatus = 'pending' | 'inspecting' | 'pass' | 'fail' | 'rework' | 'scrap';

export type ProcessStatus =
  | 'created'
  | 'material_ready'
  | 'in_progress'
  | 'qc_pending'
  | 'qc_pass'
  | 'qc_fail'
  | 'rework'
  | 'completed';

export type AnyStatus = InspectStatus | ProcessStatus;

export type TransitionCondition = (context: Record<string, any>) => boolean;

export interface TransitionConfig<S extends string> {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  allowedTransitions: Array<{
    to: S;
    condition?: TransitionCondition;
    conditionDesc?: string;
  }>;
  onEnter?: (context: Record<string, any>) => void;
  onExit?: (context: Record<string, any>) => void;
}

export const inspectStateMachine: Record<InspectStatus, TransitionConfig<InspectStatus>> = {
  pending: {
    label: '待检验',
    color: 'bg-gray-100 text-gray-700',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    allowedTransitions: [
      {
        to: 'inspecting',
        condition: (ctx) => ctx.hasInspector === true,
        conditionDesc: '需要有检验员',
      },
    ],
  },
  inspecting: {
    label: '检验中',
    color: 'bg-blue-100 text-blue-700',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    allowedTransitions: [
      {
        to: 'pass',
        condition: (ctx) => {
          const threshold = CalcParamService.getCachedDecimal('qc.pass_rate_threshold', 98);
          return ctx.passRate >= threshold || ctx.inspectionResult === 'pass';
        },
        conditionDesc: '合格率>=配置阈值(默认98%)或判定为合格',
      },
      {
        to: 'fail',
        condition: (ctx) => {
          const threshold = CalcParamService.getCachedDecimal('qc.pass_rate_threshold', 98);
          return ctx.passRate < threshold || ctx.inspectionResult === 'fail';
        },
        conditionDesc: '合格率<配置阈值(默认98%)或判定为不合格',
      },
    ],
    onExit: (ctx) => {
      ctx.inspectionTime = new Date().toISOString();
    },
  },
  pass: {
    label: '合格',
    color: 'bg-green-100 text-green-700',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    allowedTransitions: [],
  },
  fail: {
    label: '不合格',
    color: 'bg-red-100 text-red-700',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    allowedTransitions: [
      {
        to: 'rework',
        condition: (ctx) => ctx.canRework === true,
        conditionDesc: '允许返工',
      },
      {
        to: 'scrap',
        condition: (ctx) => ctx.scrapReason !== undefined,
        conditionDesc: '有报废原因',
      },
    ],
  },
  rework: {
    label: '返工',
    color: 'bg-yellow-100 text-yellow-700',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    allowedTransitions: [
      {
        to: 'pending',
        condition: (ctx) => ctx.reworkComplete === true,
        conditionDesc: '返工完成',
      },
      {
        to: 'scrap',
        condition: (ctx) => ctx.maxReworkReached === true,
        conditionDesc: '已达最大返工次数',
      },
    ],
  },
  scrap: {
    label: '报废',
    color: 'bg-black text-white',
    bgColor: 'bg-black',
    textColor: 'text-white',
    allowedTransitions: [],
  },
};

export const processStateMachine: Record<ProcessStatus, TransitionConfig<ProcessStatus>> = {
  created: {
    label: '已创建',
    color: 'bg-gray-100 text-gray-700',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    allowedTransitions: [
      {
        to: 'material_ready',
        condition: (ctx) => ctx.materialReady === true,
        conditionDesc: '物料已就位',
      },
    ],
  },
  material_ready: {
    label: '材料准备',
    color: 'bg-blue-100 text-blue-700',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    allowedTransitions: [
      {
        to: 'in_progress',
        condition: (ctx) => ctx.equipmentReady === true,
        conditionDesc: '设备就绪',
      },
    ],
  },
  in_progress: {
    label: '生产中',
    color: 'bg-yellow-100 text-yellow-700',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    allowedTransitions: [
      {
        to: 'qc_pending',
        condition: (ctx) => ctx.productionComplete === true,
        conditionDesc: '生产完成',
      },
    ],
  },
  qc_pending: {
    label: '待检验',
    color: 'bg-orange-100 text-orange-700',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    allowedTransitions: [
      {
        to: 'qc_pass',
        condition: (ctx) => ctx.qcResult === 'pass',
        conditionDesc: '质检合格',
      },
      {
        to: 'qc_fail',
        condition: (ctx) => ctx.qcResult === 'fail',
        conditionDesc: '质检不合格',
      },
    ],
  },
  qc_pass: {
    label: '检验通过',
    color: 'bg-green-100 text-green-700',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    allowedTransitions: [
      {
        to: 'completed',
        condition: (ctx) => ctx.finishedQty >= ctx.plannedQty,
        conditionDesc: '完工数量达到计划数量',
      },
    ],
  },
  qc_fail: {
    label: '检验失败',
    color: 'bg-red-100 text-red-700',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    allowedTransitions: [
      {
        to: 'rework',
        condition: (ctx) => ctx.canRework === true,
        conditionDesc: '允许返工',
      },
    ],
  },
  rework: {
    label: '返工中',
    color: 'bg-purple-100 text-purple-700',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    allowedTransitions: [
      {
        to: 'qc_pending',
        condition: (ctx) => ctx.reworkComplete === true,
        conditionDesc: '返工完成',
      },
    ],
  },
  completed: {
    label: '已完成',
    color: 'bg-indigo-100 text-indigo-700',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    allowedTransitions: [],
  },
};

export interface TransitionRecord {
  id?: number;
  entityType: 'inspect' | 'process';
  entityId: number;
  fromStatus: string;
  toStatus: string;
  conditionCheck?: string;
  passed: boolean;
  operatorId?: number;
  operatorName?: string;
  remark?: string;
  createTime?: Date;
}

export class EnhancedStateMachineValidator {
  static canTransitionInspect(
    from: InspectStatus,
    to: InspectStatus,
    context: Record<string, any> = {}
  ): { allowed: boolean; reason?: string } {
    if (from === to) return { allowed: true };

    const config = inspectStateMachine[from];
    const transition = config.allowedTransitions.find((t) => t.to === to);

    if (!transition) {
      return {
        allowed: false,
        reason: `不允许从"${config.label}"流转到"${inspectStateMachine[to].label}"`,
      };
    }

    if (transition.condition && !transition.condition(context)) {
      return {
        allowed: false,
        reason: `条件未满足: ${transition.conditionDesc || '未知条件'}`,
      };
    }

    return { allowed: true };
  }

  static canTransitionProcess(
    from: ProcessStatus,
    to: ProcessStatus,
    context: Record<string, any> = {}
  ): { allowed: boolean; reason?: string } {
    if (from === to) return { allowed: true };

    const config = processStateMachine[from];
    const transition = config.allowedTransitions.find((t) => t.to === to);

    if (!transition) {
      return {
        allowed: false,
        reason: `不允许从"${config.label}"流转到"${processStateMachine[to].label}"`,
      };
    }

    if (transition.condition && !transition.condition(context)) {
      return {
        allowed: false,
        reason: `条件未满足: ${transition.conditionDesc || '未知条件'}`,
      };
    }

    return { allowed: true };
  }

  static getAvailableTransitionsInspect(
    status: InspectStatus,
    context: Record<string, any> = {}
  ): Array<{ to: InspectStatus; conditionDesc?: string }> {
    const config = inspectStateMachine[status];
    return config.allowedTransitions
      .filter((t) => !t.condition || t.condition(context))
      .map((t) => ({ to: t.to, conditionDesc: t.conditionDesc }));
  }

  static getAvailableTransitionsProcess(
    status: ProcessStatus,
    context: Record<string, any> = {}
  ): Array<{ to: ProcessStatus; conditionDesc?: string }> {
    const config = processStateMachine[status];
    return config.allowedTransitions
      .filter((t) => !t.condition || t.condition(context))
      .map((t) => ({ to: t.to, conditionDesc: t.conditionDesc }));
  }
}

export class StateTransitionLogger {
  static async logTransition(record: TransitionRecord): Promise<number> {
    try {
      const [result]: any = await execute(
        `INSERT INTO sys_state_transition_log
         (entity_type, entity_id, from_status, to_status, condition_check, passed, operator_id, operator_name, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          record.entityType,
          record.entityId,
          record.fromStatus,
          record.toStatus,
          record.conditionCheck || null,
          record.passed ? 1 : 0,
          record.operatorId || null,
          record.operatorName || null,
          record.remark || null,
        ]
      );

      secureLog('info', 'State transition logged', {
        entityType: record.entityType,
        entityId: record.entityId,
        from: record.fromStatus,
        to: record.toStatus,
        passed: record.passed,
      });

      return result.insertId;
    } catch (error) {
      secureLog('error', 'Failed to log state transition', {
        entityType: record.entityType,
        entityId: record.entityId,
        error: String(error),
      });
      return 0;
    }
  }

  static async getTransitionHistory(
    entityType: 'inspect' | 'process',
    entityId: number
  ): Promise<TransitionRecord[]> {
    const { query } = await import('@/lib/db');
    const rows: any = await query(
      `SELECT id, entity_type, entity_id, from_status, to_status, condition_check, passed,
              operator_id, operator_name, remark, create_time
       FROM sys_state_transition_log
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY create_time ASC`,
      [entityType, entityId]
    );

    return (rows || []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      conditionCheck: row.condition_check,
      passed: row.passed === 1,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      remark: row.remark,
      createTime: row.create_time,
    }));
  }

  static async getTransitionPath(
    entityType: 'inspect' | 'process',
    entityId: number
  ): Promise<string[]> {
    const history = await this.getTransitionHistory(entityType, entityId);
    return history.map((h) => h.toStatus);
  }
}

export class StateMachineExecutor {
  static async executeTransitionInspect(
    entityId: number,
    from: InspectStatus,
    to: InspectStatus,
    context: Record<string, any> = {},
    operatorId?: number,
    operatorName?: string,
    remark?: string
  ): Promise<{ success: boolean; error?: string; recordId?: number }> {
    const check = EnhancedStateMachineValidator.canTransitionInspect(from, to, context);

    const conditionCheck = JSON.stringify(context);

    await StateTransitionLogger.logTransition({
      entityType: 'inspect',
      entityId,
      fromStatus: from,
      toStatus: to,
      conditionCheck,
      passed: check.allowed,
      operatorId,
      operatorName,
      remark,
    });

    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    return { success: true };
  }

  static async executeTransitionProcess(
    entityId: number,
    from: ProcessStatus,
    to: ProcessStatus,
    context: Record<string, any> = {},
    operatorId?: number,
    operatorName?: string,
    remark?: string
  ): Promise<{ success: boolean; error?: string; recordId?: number }> {
    const check = EnhancedStateMachineValidator.canTransitionProcess(from, to, context);

    const conditionCheck = JSON.stringify(context);

    await StateTransitionLogger.logTransition({
      entityType: 'process',
      entityId,
      fromStatus: from,
      toStatus: to,
      conditionCheck,
      passed: check.allowed,
      operatorId,
      operatorName,
      remark,
    });

    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    return { success: true };
  }
}
