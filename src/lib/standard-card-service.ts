/**
 * @module 工艺卡标准卡服务
 * @description 管理工艺卡的创建、版本升级、审批与模板操作。支持从模板/已有卡片复制参数创建新工艺卡，
 * 自动对比版本差异并递增版本号，提供完整的版本历史追溯与样品转量产流程。
 */
import type { PoolConnection, RowDataPacket, ResultSetHeader, ExecuteValues } from 'mysql2/promise';
import type { SqlValue } from '@/lib/db';

/**
 * 工艺技术参数接口，包含印刷、网版、油墨、裁切和质量标准五个维度的参数配置。
 * 每个维度均为可选，仅在对应工序启用时才需填写。
 */
export interface TechParams {
  print_params?: {
    color_order?: string[];
    print_speed?: number;
    pressure?: number;
    drying_temp?: number;
    ink_coverage?: number;
  };
  screen_params?: {
    mesh_count?: number;
    tension?: number;
    angle?: number;
    emulsion_type?: string;
  };
  ink_params?: {
    viscosity?: number;
    brand?: string;
    formula?: string;
    color_code?: string;
  };
  cutting_params?: {
    blade_type?: string;
    cutting_speed?: number;
    cutting_depth?: number;
  };
  quality_standards?: {
    register_tolerance?: number;
    color_delta_e?: number;
    ink_adhesion_level?: number;
  };
}

/**
 * 工艺卡模板接口，定义一套预设的技术参数方案，可用于快速初始化新工艺卡。
 */
export interface ProcessCardTemplate {
  id: number;
  name: string;
  category: string;
  tech_params: TechParams;
  description: string;
}

/**
 * 版本差异记录接口，描述两个版本之间某个具体字段的变更内容。
 */
export interface VersionDiff {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

/**
 * 工艺卡版本记录接口，包含某次版本快照的完整信息。
 * 通过 parent_id 链接形成版本树，支持追溯每次变更的历史状态。
 */
export interface CardVersion {
  id: number;
  card_id: number;
  version: string;
  parent_id: number | null;
  tech_params: TechParams;
  status: 'draft' | 'pending_approval' | 'approved' | 'obsolete';
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  change_description: string;
}

/**
 * 创建工艺卡的输入数据
 */
interface CreateCardInput {
  card_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_code?: string | null;
  product_name?: string | null;
  tech_params?: string | TechParams;
  creator_id?: number | null;
}

/**
 * 更新工艺卡的输入数据
 */
interface UpdateCardInput {
  tech_params?: string | TechParams;
  card_no?: string;
  customer_id?: number | null;
  customer_name?: string | null;
  product_name?: string | null;
}

/**
 * 深度合并两份 TechParams 对象，source 中的字段会覆盖 target 中同路径的值。
 * 对于嵌套对象采用一级浅合并（同键以 source 为准），非对象类型直接替换。
 *
 * @param target - 被合并的基础参数对象，将作为合并结果的起点
 * @param source - 要合并进去的参数对象，其值会覆盖 target 中相同路径的值
 * @returns 合并后的新 TechParams 对象（深拷贝，不影响原始对象）
 */
function deepMerge(target: TechParams, source: TechParams): TechParams {
  const result: TechParams = JSON.parse(JSON.stringify(target));
  for (const key of Object.keys(source) as (keyof TechParams)[]) {
    if (source[key] !== undefined) {
      if (result[key] && typeof source[key] === 'object' && typeof result[key] === 'object') {
        // 合并两个对象类型的参数段，保留 result 中的其他字段
        const merged = { ...result[key], ...source[key] } as NonNullable<TechParams[typeof key]>;
        (result as Record<string, unknown>)[key] = merged;
      } else {
        (result as Record<string, unknown>)[key] = source[key];
      }
    }
  }
  return result;
}

/**
 * 对比两份 TechParams，找出所有发生变更的子字段并返回差异列表。
 * 对比逻辑按五大维度（print_params、screen_params 等）逐层展开，
 * 逐键比较新旧值（通过 JSON.stringify 判等），仅收集有差异的字段。
 *
 * @param oldParams - 旧版本的技术参数
 * @param newParams - 新版本的技术参数
 * @returns 差异列表，每项包含字段路径（如 "print_params.color_order"）、旧值和新值；
 *          新增字段 old_value 为 null，删除字段 new_value 为 null
 */
export function compareVersions(oldParams: TechParams, newParams: TechParams): VersionDiff[] {
  const diffs: VersionDiff[] = [];

  const paramKeys: (keyof TechParams)[] = [
    'print_params',
    'screen_params',
    'ink_params',
    'cutting_params',
    'quality_standards',
  ];

  for (const key of paramKeys) {
    const oldSection = oldParams[key];
    const newSection = newParams[key];

    if (!oldSection && !newSection) continue;

    if (!oldSection && newSection) {
      for (const subKey of Object.keys(newSection) as string[]) {
        diffs.push({
          field: `${key}.${subKey}`,
          old_value: null,
          new_value: (newSection as Record<string, unknown>)[subKey],
        });
      }
      continue;
    }

    if (oldSection && !newSection) {
      for (const subKey of Object.keys(oldSection) as string[]) {
        diffs.push({
          field: `${key}.${subKey}`,
          old_value: (oldSection as Record<string, unknown>)[subKey],
          new_value: null,
        });
      }
      continue;
    }

    if (oldSection && newSection) {
      const allSubKeys = Array.from(
        new Set([...Object.keys(oldSection), ...Object.keys(newSection)])
      );

      const oldRec = oldSection as Record<string, unknown>;
      const newRec = newSection as Record<string, unknown>;

      for (const subKey of allSubKeys) {
        const oldVal = oldRec[subKey];
        const newVal = newRec[subKey];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          diffs.push({
            field: `${key}.${subKey}`,
            old_value: oldVal ?? null,
            new_value: newVal ?? null,
          });
        }
      }
    }
  }

  return diffs;
}

/**
 * 根据当前版本号递增版本。版本号格式为 V主.次（如 V2.3）。
 * 若 isMajor 为 true 则主版本号+1、次版本归零（重大变更）；否则仅次版本号+1（小变更）。
 * 若当前版本号格式不符合 V主.次 规范，则默认返回 V1.0。
 *
 * @param currentVersion - 当前版本号字符串，期望格式为 "V主.次"
 * @param isMajor - 是否为重大变更；true 时主版本递增，false 时次版本递增
 * @returns 递增后的新版本号字符串
 */
function incrementVersion(currentVersion: string, isMajor: boolean): string {
  const match = currentVersion.match(/^V(\d+)\.(\d+)$/);
  if (!match) return 'V1.0';

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);

  if (isMajor) {
    return `V${major + 1}.0`;
  }
  return `V${major}.${minor + 1}`;
}

/**
 * 创建工艺卡并初始化首版本（V1.0）。支持三种参数来源按优先级叠加：
 * 1. 模板（templateId）——从模板表获取预设参数；
 * 2. 复制来源（copyFromId）——从已有工艺卡复制参数；
 * 3. cardData.tech_params——直接传入的参数，优先级最高。
 * 三者通过 deepMerge 逐层叠加，最终合并结果写入新卡。
 * 创建完成后自动插入审计记录。
 *
 * @param conn - 数据库连接对象（需支持 query/execute 方法）
 * @param cardData - 新工艺卡的基本数据，包含 card_no、customer_id 等字段
 * @param templateId - 可选，模板 ID，从模板继承技术参数
 * @param copyFromId - 可选，源工艺卡 ID，从已有卡复制技术参数
 * @param operatorName - 操作人姓名，默认为 'system'
 * @returns 包含新卡 ID 和初始版本号的对象 { card_id, version }
 * @throws 当数据库操作失败时抛出异常
 */
export async function createCardWithVersion(
  conn: PoolConnection,
  cardData: CreateCardInput,
  templateId?: number,
  copyFromId?: number,
  operatorName: string = 'system'
): Promise<{ card_id: number; version: string }> {
  let techParams: TechParams = {};

  if (templateId) {
    try {
      const [templateRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, name, category, tech_params, description FROM prd_process_card_templates WHERE id = ? AND deleted = 0`,
        [templateId]
      );
      if (templateRows && templateRows.length > 0) {
        const template = templateRows[0];
        try {
          const templateParams =
            typeof template.tech_params === 'string'
              ? JSON.parse(template.tech_params)
              : template.tech_params;
          techParams = deepMerge(techParams, templateParams);
        } catch {
          techParams = {};
        }
      }
    } catch {}
  }

  if (copyFromId) {
    const [sourceRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, tech_params FROM prd_process_card WHERE id = ? AND deleted = 0`,
      [copyFromId]
    );
    if (sourceRows && sourceRows.length > 0) {
      try {
        const sourceParams =
          typeof sourceRows[0].tech_params === 'string'
            ? JSON.parse(sourceRows[0].tech_params)
            : sourceRows[0].tech_params;
        techParams = deepMerge(techParams, sourceParams);
      } catch {
        techParams = {};
      }
    }
  }

  if (cardData.tech_params) {
    const cardParams =
      typeof cardData.tech_params === 'string'
        ? JSON.parse(cardData.tech_params)
        : cardData.tech_params;
    techParams = deepMerge(techParams, cardParams);
  }

  const version = 'V1.0';
  const techParamsJson = JSON.stringify(techParams);

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO prd_process_card (
      card_no, customer_id, customer_name, customer_code, product_name,
      version, tech_params, status, creator_id, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW(), 0)`,
    [
      cardData.card_no,
      cardData.customer_id || null,
      cardData.customer_name || null,
      cardData.customer_code || null,
      cardData.product_name || null,
      version,
      techParamsJson,
      cardData.creator_id || null,
    ]
  );

  const cardId = result.insertId;

  await conn.execute(
    `INSERT INTO prd_process_card_audit (
      card_id, version, action, operator, change_description, tech_params, create_time
    ) VALUES (?, ?, 'create', ?, ?, ?, NOW())`,
    [cardId, version, operatorName, '创建工艺卡', techParamsJson]
  );

  return { card_id: cardId, version };
}

/**
 * 更新工艺卡并自动升级版本号。先读取当前卡片的 tech_params，与更新参数做 deepMerge，
 * 通过 compareVersions 生成差异列表；如有差异则视为重大变更（主版本递增），无差异则小版本递增。
 * 更新完成后写入审计记录，记录变更描述与完整参数快照。
 *
 * @param conn - 数据库连接对象
 * @param cardId - 待更新的工艺卡 ID
 * @param updates - 更新数据，可包含 tech_params、card_no、customer_id 等字段
 * @param operatorName - 操作人姓名，默认为 'system'
 * @param changeDescription - 可选的自定义变更描述；为空时自动生成包含变更字段的描述
 * @returns 包含卡片 ID、新版本号和差异列表的对象 { card_id, new_version, diff }
 * @throws 当工艺卡不存在时抛出 "工艺卡不存在" 异常
 */
export async function updateCardWithVersion(
  conn: PoolConnection,
  cardId: number,
  updates: UpdateCardInput,
  operatorName: string = 'system',
  changeDescription: string = ''
): Promise<{ card_id: number; new_version: string; diff: VersionDiff[] }> {
  const [cardRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, card_no, version, tech_params, status FROM prd_process_card WHERE id = ? AND deleted = 0`,
    [cardId]
  );

  if (!cardRows || cardRows.length === 0) {
    throw new Error(`工艺卡不存在: ID ${cardId}`);
  }

  const card = cardRows[0];
  const currentVersion = card.version || 'V1.0';

  let oldTechParams: TechParams = {};
  try {
    oldTechParams =
      typeof card.tech_params === 'string' ? JSON.parse(card.tech_params) : card.tech_params || {};
  } catch {
    oldTechParams = {};
  }

  let newTechParams: TechParams = JSON.parse(JSON.stringify(oldTechParams));
  if (updates.tech_params) {
    const updateParams =
      typeof updates.tech_params === 'string'
        ? JSON.parse(updates.tech_params)
        : updates.tech_params;
    newTechParams = deepMerge(newTechParams, updateParams);
  }

  const diff = compareVersions(oldTechParams, newTechParams);
  const isMajor = diff.length > 0;

  const newVersion = incrementVersion(currentVersion, isMajor);

  const techParamsJson = JSON.stringify(newTechParams);

  const setClauses: string[] = ['version = ?', 'tech_params = ?', 'update_time = NOW()'];
  const params: ExecuteValues[] = [newVersion, techParamsJson];

  if (updates.card_no !== undefined) {
    setClauses.push('card_no = ?');
    params.push(updates.card_no);
  }
  if (updates.customer_id !== undefined) {
    setClauses.push('customer_id = ?');
    params.push(updates.customer_id);
  }
  if (updates.customer_name !== undefined) {
    setClauses.push('customer_name = ?');
    params.push(updates.customer_name);
  }
  if (updates.product_name !== undefined) {
    setClauses.push('product_name = ?');
    params.push(updates.product_name);
  }

  params.push(cardId);

  await conn.execute(`UPDATE prd_process_card SET ${setClauses.join(', ')} WHERE id = ?`, params);

  const description =
    changeDescription ||
    (diff.length > 0
      ? `版本升级 ${currentVersion} -> ${newVersion}，变更字段: ${diff.map((d) => d.field).join(', ')}`
      : `版本升级 ${currentVersion} -> ${newVersion}`);

  await conn.execute(
    `INSERT INTO prd_process_card_audit (
      card_id, version, action, operator, change_description, tech_params, create_time
    ) VALUES (?, ?, 'update', ?, ?, ?, NOW())`,
    [cardId, newVersion, operatorName, description, techParamsJson]
  );

  return { card_id: cardId, new_version: newVersion, diff };
}

/**
 * 获取指定工艺卡的完整版本历史。按创建时间升序查询审计表所有记录，
 * 通过 parent_id 链形成版本树：每条记录的 parent_id 指向前一条记录的 id。
 * 最新一条记录的状态取自当前卡片状态字段，历史版本统一标记为 'obsolete'。
 *
 * @param conn - 数据库连接对象
 * @param cardId - 工艺卡 ID
 * @returns 版本历史数组，按创建时间从早到晚排列；若无记录则返回空数组
 */
export async function getVersionHistory(conn: PoolConnection, cardId: number): Promise<CardVersion[]> {
  const [auditRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, card_id, version, action, operator, change_description, tech_params, create_time
     FROM prd_process_card_audit
     WHERE card_id = ?
     ORDER BY create_time ASC`,
    [cardId]
  );

  if (!auditRows || auditRows.length === 0) {
    return [];
  }

  const [cardRows] = await conn.query<RowDataPacket[]>(
    `SELECT version, status FROM prd_process_card WHERE id = ? AND deleted = 0`,
    [cardId]
  );

  const currentStatus = cardRows && cardRows.length > 0 ? cardRows[0].status : 'draft';

  let parentId: number | null = null;
  const versions: CardVersion[] = [];

  for (let i = 0; i < auditRows.length; i++) {
    const row = auditRows[i];
    let techParams: TechParams = {};
    try {
      techParams =
        typeof row.tech_params === 'string' ? JSON.parse(row.tech_params) : row.tech_params || {};
    } catch {
      techParams = {};
    }

    const isLatest = i === auditRows.length - 1;

    versions.push({
      id: row.id,
      card_id: row.card_id,
      version: row.version,
      parent_id: parentId,
      tech_params: techParams,
      status: isLatest
        ? currentStatus === 3
          ? 'approved'
          : currentStatus === 1
            ? 'draft'
            : currentStatus === 2
              ? 'pending_approval'
              : 'obsolete'
        : 'obsolete',
      approved_by: null,
      approved_at: null,
      created_by: row.operator || 'system',
      created_at: row.create_time?.toISOString?.() || String(row.create_time),
      change_description: row.change_description || '',
    });

    parentId = row.id;
  }

  return versions;
}

/**
 * 审批通过指定工艺卡的当前版本。校验请求版本与卡片实际版本是否一致，
 * 将卡片状态设为已审批（status=3）并写入审批审计记录。
 *
 * @param conn - 数据库连接对象
 * @param cardId - 工艺卡 ID
 * @param version - 待审批的版本号，必须与卡片当前版本号一致
 * @param approverName - 审批人姓名
 * @returns 无返回值（void）
 * @throws 当工艺卡不存在时抛出 "工艺卡不存在" 异常
 * @throws 当版本号不匹配时抛出 "版本不匹配" 异常
 */
export async function approveCardVersion(
  conn: PoolConnection,
  cardId: number,
  version: string,
  approverName: string
): Promise<void> {
  const [cardRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, version, status FROM prd_process_card WHERE id = ? AND deleted = 0`,
    [cardId]
  );

  if (!cardRows || cardRows.length === 0) {
    throw new Error(`工艺卡不存在: ID ${cardId}`);
  }

  const card = cardRows[0];

  if (card.version !== version) {
    throw new Error(`版本不匹配: 当前版本 ${card.version}，请求审批版本 ${version}`);
  }

  await conn.execute(
    `UPDATE prd_process_card SET status = 3, update_time = NOW() WHERE id = ? AND version = ?`,
    [cardId, version]
  );

  await conn.execute(
    `INSERT INTO prd_process_card_audit (
      card_id, version, action, operator, change_description, tech_params, create_time
    ) VALUES (?, ?, 'approve', ?, ?, NULL, NOW())`,
    [cardId, version, approverName, `版本 ${version} 审批通过`]
  );
}

/**
 * 查询工艺卡模板列表。支持按分类筛选，返回结果按分类和名称排序。
 * 模板的 tech_params 字段会从 JSON 字符串自动解析为 TechParams 对象。
 *
 * @param conn - 数据库连接对象
 * @param category - 可选的分类名称，用于筛选特定类别的模板
 * @returns 模板数组；查询失败或无数据时返回空数组
 */
export async function getTemplates(conn: PoolConnection, category?: string): Promise<ProcessCardTemplate[]> {
  try {
    let sql = `SELECT id, name, category, tech_params, description FROM prd_process_card_templates WHERE deleted = 0`;
    const params: SqlValue[] = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY category, name`;

    const [rows] = await conn.query<RowDataPacket[]>(sql, params);

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row) => {
      let techParams: TechParams = {};
      try {
        techParams =
          typeof row.tech_params === 'string' ? JSON.parse(row.tech_params) : row.tech_params || {};
      } catch {
        techParams = {};
      }

      return {
        id: row.id,
        name: row.name,
        category: row.category,
        tech_params: techParams,
        description: row.description || '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * 将样品工艺卡转换为量产工艺卡。读取样品卡的全部基础信息和技术参数，
 * 通过 deepMerge 叠加用户提供的调整参数（adjustments），生成新的量产卡。
 * 量产卡的卡号格式为原卡号加 "-M" 后缀，版本号从 V1.0 开始。
 * 创建完成后写入审计记录，标注来源样品卡号。
 *
 * @param conn - 数据库连接对象
 * @param sampleCardId - 样品工艺卡 ID
 * @param adjustments - 对样品参数的调整，为 TechParams 的部分字段；会与样品参数合并
 * @param operatorName - 操作人姓名，默认为 'system'
 * @returns 包含新卡 ID 和版本号的对象 { card_id, version }
 * @throws 当样品工艺卡不存在时抛出 "样品工艺卡不存在" 异常
 */
export async function convertSampleToMass(
  conn: PoolConnection,
  sampleCardId: number,
  adjustments: Partial<TechParams>,
  operatorName: string = 'system'
): Promise<{ card_id: number; version: string }> {
  const [sampleRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, card_no, customer_id, customer_name, customer_code, product_name,
            version, tech_params, status
     FROM prd_process_card WHERE id = ? AND deleted = 0`,
    [sampleCardId]
  );

  if (!sampleRows || sampleRows.length === 0) {
    throw new Error(`样品工艺卡不存在: ID ${sampleCardId}`);
  }

  const sample = sampleRows[0];

  let techParams: TechParams = {};
  try {
    techParams =
      typeof sample.tech_params === 'string'
        ? JSON.parse(sample.tech_params)
        : sample.tech_params || {};
  } catch {
    techParams = {};
  }

  if (adjustments) {
    techParams = deepMerge(techParams, adjustments as TechParams);
  }

  const version = 'V1.0';
  const techParamsJson = JSON.stringify(techParams);

  const massCardNo = `${sample.card_no}-M`;

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO prd_process_card (
      card_no, customer_id, customer_name, customer_code, product_name,
      version, tech_params, status, creator_id, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW(), 0)`,
    [
      massCardNo,
      sample.customer_id || null,
      sample.customer_name || null,
      sample.customer_code || null,
      sample.product_name || null,
      version,
      techParamsJson,
      null,
    ]
  );

  const cardId = result.insertId;

  await conn.execute(
    `INSERT INTO prd_process_card_audit (
      card_id, version, action, operator, change_description, tech_params, create_time
    ) VALUES (?, ?, 'create', ?, ?, ?, NOW())`,
    [cardId, version, operatorName, `从样品卡 ${sample.card_no} 转换为量产卡`, techParamsJson]
  );

  return { card_id: cardId, version };
}
