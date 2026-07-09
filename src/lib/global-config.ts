export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
  create_time: string;
  update_time: string;
}

interface ConfigCache {
  data: Record<string, Loose>;
  timestamp: number;
}

let configCache: ConfigCache | null = null;
const CACHE_TTL = 5 * 60 * 1000;

const DEFAULT_CONFIGS: Record<string, Loose> = {
  doc_date_format: 'YYYYMMDD',
  serial_number_length: 4,

  wo_prefix: 'WO',
  sample_prefix: 'SAMPLE',
  mr_prefix: 'MR',
  fpr_prefix: 'FPR',
  sh_prefix: 'SH',
  po_prefix: 'PO',
  ir_prefix: 'IC',
  tr_prefix: 'TR',
  sc_prefix: 'SC',
  mp_prefix: 'MP',
  bf_prefix: 'BF',
  jd_prefix: 'JD',
  wx_prefix: 'WX',

  mould_life_days: 90,
  mould_max_times: 5000,
  mould_warn_days: 15,
  mould_scrap_rule: 'both',

  screen_life_days: 60,
  screen_max_times: 3000,
  screen_warn_days: 10,

  ink_unopened_shelf_life: 180,
  ink_opened_shelf_life: 30,
  mixed_ink_expiry_hours: 24,
  ink_warn_days: 7,

  pet_film_shelf_life: 360,
  solvent_shelf_life: 180,
  glue_shelf_life: 90,
  mesh_shelf_life: 180,
  material_warn_days: 30,

  film_split_length: 10,
  pvc_split_length: 10,
  ink_split_weight: 1,
  solvent_split_volume: 5,
  mesh_split_length: 10,

  fifo_enabled: true,
  allow_whole_material_issue: false,
  allow_skip_process: false,
  allow_over_requisition: false,

  stocktaking_cycle_days: 30,
  obsolete_material_days: 90,
  quality_check_mandatory: true,

  require_approval_for_config_change: true,
  approval_role_id: 1,

  dashboard_trend_days: 30,
  aging_30_days: 30,
  aging_60_days: 60,
  aging_90_days: 90,
  stocktaking_diff_threshold: 100,
};

function getConfigFromCache(): Record<string, Loose> | null {
  if (configCache && Date.now() - configCache.timestamp < CACHE_TTL) {
    return configCache.data;
  }
  return null;
}

function setConfigToCache(data: Record<string, Loose>): void {
  configCache = {
    data,
    timestamp: Date.now(),
  };
}

export function getDefaultConfig(): Record<string, Loose> {
  return { ...DEFAULT_CONFIGS };
}

export function getConfig(key?: string): Loose {
  const cachedConfig = getConfigFromCache();

  if (!cachedConfig) {
    return key ? DEFAULT_CONFIGS[key] : { ...DEFAULT_CONFIGS };
  }

  if (key) {
    return cachedConfig[key] !== undefined ? cachedConfig[key] : DEFAULT_CONFIGS[key];
  }

  return { ...DEFAULT_CONFIGS, ...cachedConfig };
}

export function setConfig(configs: Record<string, Loose>): void {
  setConfigToCache({ ...DEFAULT_CONFIGS, ...configs });
}

export function clearConfigCache(): void {
  configCache = null;
}

export function getWoPrefix(): string {
  return getConfig('wo_prefix');
}

export function getSamplePrefix(): string {
  return getConfig('sample_prefix');
}

export function getMrPrefix(): string {
  return getConfig('mr_prefix');
}

export function getFprPrefix(): string {
  return getConfig('fpr_prefix');
}

export function getQiPrefix(): string {
  return getConfig('qi_prefix') || 'QI';
}

export function getShPrefix(): string {
  return getConfig('sh_prefix');
}

export function getPoPrefix(): string {
  return getConfig('po_prefix');
}

export function getIcPrefix(): string {
  return getConfig('ir_prefix');
}

export function getTrPrefix(): string {
  return getConfig('tr_prefix');
}

export function getWrPrefix(): string {
  return getConfig('wr_prefix') || 'WR';
}

export function getMouldLifeDays(): number {
  return Number(getConfig('mould_life_days'));
}

export function getMouldMaxTimes(): number {
  return Number(getConfig('mould_max_times'));
}

export function getMouldWarnDays(): number {
  return Number(getConfig('mould_warn_days'));
}

export function getScreenLifeDays(): number {
  return Number(getConfig('screen_life_days'));
}

export function getMaxScreenTimes(): number {
  return Number(getConfig('screen_max_times'));
}

export function getScreenWarnDays(): number {
  return Number(getConfig('screen_warn_days'));
}

export function isInkUnopenedShelfLife(): number {
  return Number(getConfig('ink_unopened_shelf_life'));
}

export function getInkOpenedShelfLife(): number {
  return Number(getConfig('ink_opened_shelf_life'));
}

export function getMixedInkExpiryHours(): number {
  return Number(getConfig('mixed_ink_expiry_hours'));
}

export function getFilmSplitLength(): number {
  return Number(getConfig('film_split_length'));
}

export function getInkSplitWeight(): number {
  return Number(getConfig('ink_split_weight'));
}

export function getSolventSplitVolume(): number {
  return Number(getConfig('solvent_split_volume'));
}

export function isFifoEnabled(): boolean {
  return Boolean(getConfig('fifo_enabled'));
}

export function allowWholeMaterialIssue(): boolean {
  return Boolean(getConfig('allow_whole_material_issue'));
}

export function allowSkipProcess(): boolean {
  return Boolean(getConfig('allow_skip_process'));
}

export function allowOverRequisition(): boolean {
  return Boolean(getConfig('allow_over_requisition'));
}

export function getStocktakingCycleDays(): number {
  return Number(getConfig('stocktaking_cycle_days'));
}

export function getObsoleteMaterialDays(): number {
  return Number(getConfig('obsolete_material_days'));
}

export function isQualityCheckMandatory(): boolean {
  return Boolean(getConfig('quality_check_mandatory'));
}

export function requireApprovalForConfigChange(): boolean {
  return Boolean(getConfig('require_approval_for_config_change'));
}

export function getScPrefix(): string {
  return getConfig('sc_prefix');
}

export function getMpPrefix(): string {
  return getConfig('mp_prefix');
}

export function getBfPrefix(): string {
  return getConfig('bf_prefix');
}

export function getJdPrefix(): string {
  return getConfig('jd_prefix');
}

export function getWxPrefix(): string {
  return getConfig('wx_prefix');
}

export function getMouldScrapRule(): string {
  return getConfig('mould_scrap_rule') || 'both';
}

export function getInkWarnDays(): number {
  return Number(getConfig('ink_warn_days'));
}

export function getPetFilmShelfLife(): number {
  return Number(getConfig('pet_film_shelf_life'));
}

export function getSolventShelfLife(): number {
  return Number(getConfig('solvent_shelf_life'));
}

export function getGlueShelfLife(): number {
  return Number(getConfig('glue_shelf_life'));
}

export function getMeshShelfLife(): number {
  return Number(getConfig('mesh_shelf_life'));
}

export function getMaterialWarnDays(): number {
  return Number(getConfig('material_warn_days'));
}

export function getPvcSplitLength(): number {
  return Number(getConfig('pvc_split_length'));
}

export function getMeshSplitLength(): number {
  return Number(getConfig('mesh_split_length'));
}

export function getDocDateFormat(): string {
  return getConfig('doc_date_format') || 'YYYYMMDD';
}

export function getSerialNumberLength(): number {
  return Number(getConfig('serial_number_length') || 4);
}

export function generateDocNo(prefix: string): string {
  const now = new Date();
  const dateStr =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const serialLen = getSerialNumberLength();
  const maxSerial = Math.pow(10, serialLen);
  const random = String(Math.floor(Math.random() * (maxSerial - 1)) + 1).padStart(serialLen, '0');
  return `${prefix}${dateStr}${random}`;
}
