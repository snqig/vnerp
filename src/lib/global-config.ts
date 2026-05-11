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
  data: Record<string, any>;
  timestamp: number;
}

let configCache: ConfigCache | null = null;
const CACHE_TTL = 5 * 60 * 1000;

const DEFAULT_CONFIGS: Record<string, any> = {
  wo_prefix: 'WO',
  sample_prefix: 'SAMPLE',
  mr_prefix: 'MR',
  fpr_prefix: 'FPR',
  sh_prefix: 'SH',
  po_prefix: 'PO',
  ir_prefix: 'IC',
  tr_prefix: 'TR',

  mould_life_days: 90,
  mould_max_times: 5000,
  mould_warn_days: 15,

  screen_life_days: 60,
  screen_max_times: 3000,
  screen_warn_days: 10,

  ink_unopened_shelf_life: 180,
  ink_opened_shelf_life: 30,
  mixed_ink_expiry_hours: 24,

  film_split_length: 10,
  ink_split_weight: 1,
  solvent_split_volume: 5,

  fifo_enabled: true,
  allow_whole_material_issue: false,
  allow_skip_process: false,
  allow_over_requisition: false,

  stocktaking_cycle_days: 30,
  obsolete_material_days: 90,
  quality_check_mandatory: true,

  require_approval_for_config_change: true,
  approval_role_id: 1,
};

function getConfigFromCache(): Record<string, any> | null {
  if (configCache && (Date.now() - configCache.timestamp) < CACHE_TTL) {
    return configCache.data;
  }
  return null;
}

function setConfigToCache(data: Record<string, any>): void {
  configCache = {
    data,
    timestamp: Date.now()
  };
}

export function getDefaultConfig(): Record<string, any> {
  return { ...DEFAULT_CONFIGS };
}

export function getConfig(key?: string): any {
  const cachedConfig = getConfigFromCache();
  
  if (!cachedConfig) {
    return key ? DEFAULT_CONFIGS[key] : { ...DEFAULT_CONFIGS };
  }

  if (key) {
    return cachedConfig[key] !== undefined ? cachedConfig[key] : DEFAULT_CONFIGS[key];
  }

  return { ...DEFAULT_CONFIGS, ...cachedConfig };
}

export function setConfig(configs: Record<string, any>): void {
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

export function generateDocNo(prefix: string): string {
  const now = new Date();
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
}