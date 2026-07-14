export { Die } from './aggregates/Die';
export type { DieStatusValue } from './aggregates/Die';
export { DieSpecification } from './value-objects/DieSpecification';
export type { DieSpecificationProps } from './value-objects/DieSpecification';
export { InkSpecification } from './value-objects/InkSpecification';
export type { InkSpecificationProps } from './value-objects/InkSpecification';
export { ScreenPlateSpecification } from './value-objects/ScreenPlateSpecification';
export type { ScreenPlateSpecificationProps } from './value-objects/ScreenPlateSpecification';
export {
  ProcessCardStatus,
  BurdeningStatus,
  LockStatus,
  canTransitionProcessCard,
  assertProcessCardTransition,
  getProcessCardStatusLabel,
} from './value-objects/ProcessCardStatus';
export {
  FieldMapper,
  assertField,
  assertPositive,
  assertMaxUsage,
} from './value-objects/FieldMapping';
export {
  DieCreatedEvent,
  DieStatusChangedEvent,
  DieUsageRecordedEvent,
  DieMaintenanceCreatedEvent,
  DieMaintenanceCompletedEvent,
  DieScrappedEvent,
} from './events/DieEvents';
export type { IDieRepository } from './repositories/IDieRepository';

export type DieApiResponse = {
  id: number;
  templateCode: string;
  templateName: string;
  templateType: number;
  assetType: string;
  specification: string;
  material: string;
  maxUsage: number;
  currentUsage: number;
  remainingUsage: number;
  warningUsage: number;
  maxImpressions: number;
  cumulativeImpressions: number;
  warningThreshold: number;
  maintenanceInterval: number;
  maintenanceCount: number;
  dieStatus: string;
  status: number;
  qrCode: string;
  remark: string;
  createTime: string;
};

export type DashboardStatsResponse = {
  totalCount: number;
  availableCount: number;
  warningCount: number;
  lockedCount: number;
  scrapCount: number;
  maintenanceDueCount: number;
};
