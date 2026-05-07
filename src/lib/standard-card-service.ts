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

export interface ProcessCardTemplate {
  id: number;
  name: string;
  category: string;
  tech_params: TechParams;
  description: string;
}

export interface VersionDiff {
  field: string;
  old_value: any;
  new_value: any;
}

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

function deepMerge(target: TechParams, source: TechParams): TechParams {
  const result: TechParams = JSON.parse(JSON.stringify(target));
  for (const key of Object.keys(source) as (keyof TechParams)[]) {
    if (source[key] !== undefined) {
      if (result[key] && typeof source[key] === 'object' && typeof result[key] === 'object') {
        result[key] = { ...result[key], ...source[key] } as any;
      } else {
        (result as any)[key] = source[key];
      }
    }
  }
  return result;
}

export function compareVersions(
  oldParams: TechParams,
  newParams: TechParams
): VersionDiff[] {
  const diffs: VersionDiff[] = [];

  const paramKeys: (keyof TechParams)[] = [
    'print_params', 'screen_params', 'ink_params',
    'cutting_params', 'quality_standards',
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
          new_value: (newSection as any)[subKey],
        });
      }
      continue;
    }

    if (oldSection && !newSection) {
      for (const subKey of Object.keys(oldSection) as string[]) {
        diffs.push({
          field: `${key}.${subKey}`,
          old_value: (oldSection as any)[subKey],
          new_value: null,
        });
      }
      continue;
    }

    if (oldSection && newSection) {
      const allSubKeys = Array.from(new Set([
        ...Object.keys(oldSection),
        ...Object.keys(newSection),
      ]));

      for (const subKey of allSubKeys) {
        const oldVal = (oldSection as any)[subKey];
        const newVal = (newSection as any)[subKey];

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

export async function createCardWithVersion(
  conn: any,
  cardData: any,
  templateId?: number,
  copyFromId?: number,
  operatorName: string = 'system'
): Promise<{ card_id: number; version: string }> {
  let techParams: TechParams = {};

  if (templateId) {
    const [templateRows]: any = await conn.query(
      `SELECT id, name, category, tech_params, description FROM prd_process_card_templates WHERE id = ? AND deleted = 0`,
      [templateId]
    );
    if (templateRows && templateRows.length > 0) {
      const template = templateRows[0];
      try {
        const templateParams = typeof template.tech_params === 'string'
          ? JSON.parse(template.tech_params)
          : template.tech_params;
        techParams = deepMerge(techParams, templateParams);
      } catch {
        techParams = {};
      }
    }
  }

  if (copyFromId) {
    const [sourceRows]: any = await conn.query(
      `SELECT id, tech_params FROM prd_process_card WHERE id = ? AND deleted = 0`,
      [copyFromId]
    );
    if (sourceRows && sourceRows.length > 0) {
      try {
        const sourceParams = typeof sourceRows[0].tech_params === 'string'
          ? JSON.parse(sourceRows[0].tech_params)
          : sourceRows[0].tech_params;
        techParams = deepMerge(techParams, sourceParams);
      } catch {
        techParams = {};
      }
    }
  }

  if (cardData.tech_params) {
    const cardParams = typeof cardData.tech_params === 'string'
      ? JSON.parse(cardData.tech_params)
      : cardData.tech_params;
    techParams = deepMerge(techParams, cardParams);
  }

  const version = 'V1.0';
  const techParamsJson = JSON.stringify(techParams);

  const [result]: any = await conn.execute(
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

export async function updateCardWithVersion(
  conn: any,
  cardId: number,
  updates: any,
  operatorName: string = 'system',
  changeDescription: string = ''
): Promise<{ card_id: number; new_version: string; diff: VersionDiff[] }> {
  const [cardRows]: any = await conn.query(
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
    oldTechParams = typeof card.tech_params === 'string'
      ? JSON.parse(card.tech_params)
      : card.tech_params || {};
  } catch {
    oldTechParams = {};
  }

  let newTechParams: TechParams = JSON.parse(JSON.stringify(oldTechParams));
  if (updates.tech_params) {
    const updateParams = typeof updates.tech_params === 'string'
      ? JSON.parse(updates.tech_params)
      : updates.tech_params;
    newTechParams = deepMerge(newTechParams, updateParams);
  }

  const diff = compareVersions(oldTechParams, newTechParams);
  const isMajor = diff.length > 0;

  const newVersion = incrementVersion(currentVersion, isMajor);

  const techParamsJson = JSON.stringify(newTechParams);

  const setClauses: string[] = ['version = ?', 'tech_params = ?', 'update_time = NOW()'];
  const params: any[] = [newVersion, techParamsJson];

  if (updates.card_no !== undefined) { setClauses.push('card_no = ?'); params.push(updates.card_no); }
  if (updates.customer_id !== undefined) { setClauses.push('customer_id = ?'); params.push(updates.customer_id); }
  if (updates.customer_name !== undefined) { setClauses.push('customer_name = ?'); params.push(updates.customer_name); }
  if (updates.product_name !== undefined) { setClauses.push('product_name = ?'); params.push(updates.product_name); }

  params.push(cardId);

  await conn.execute(
    `UPDATE prd_process_card SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  const description = changeDescription || (diff.length > 0
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

export async function getVersionHistory(
  conn: any,
  cardId: number
): Promise<CardVersion[]> {
  const [auditRows]: any = await conn.query(
    `SELECT id, card_id, version, action, operator, change_description, tech_params, create_time
     FROM prd_process_card_audit
     WHERE card_id = ?
     ORDER BY create_time ASC`,
    [cardId]
  );

  if (!auditRows || auditRows.length === 0) {
    return [];
  }

  const [cardRows]: any = await conn.query(
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
      techParams = typeof row.tech_params === 'string'
        ? JSON.parse(row.tech_params)
        : row.tech_params || {};
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
        ? (currentStatus === 3 ? 'approved' : currentStatus === 1 ? 'draft' : currentStatus === 2 ? 'pending_approval' : 'obsolete')
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

export async function approveCardVersion(
  conn: any,
  cardId: number,
  version: string,
  approverName: string
): Promise<void> {
  const [cardRows]: any = await conn.query(
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

export async function getTemplates(
  conn: any,
  category?: string
): Promise<ProcessCardTemplate[]> {
  let sql = `SELECT id, name, category, tech_params, description FROM prd_process_card_templates WHERE deleted = 0`;
  const params: any[] = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY category, name`;

  const [rows]: any = await conn.query(sql, params);

  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row: any) => {
    let techParams: TechParams = {};
    try {
      techParams = typeof row.tech_params === 'string'
        ? JSON.parse(row.tech_params)
        : row.tech_params || {};
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
}

export async function convertSampleToMass(
  conn: any,
  sampleCardId: number,
  adjustments: Partial<TechParams>,
  operatorName: string = 'system'
): Promise<{ card_id: number; version: string }> {
  const [sampleRows]: any = await conn.query(
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
    techParams = typeof sample.tech_params === 'string'
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

  const [result]: any = await conn.execute(
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
    [
      cardId,
      version,
      operatorName,
      `从样品卡 ${sample.card_no} 转换为量产卡`,
      techParamsJson,
    ]
  );

  return { card_id: cardId, version };
}
