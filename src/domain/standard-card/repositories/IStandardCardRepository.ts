import { StandardCard } from '../aggregates/StandardCard';
import { StandardCardType } from '../value-objects/StandardCardType';
import { ColorStandardItem } from '../entities/ColorStandardItem';
import { ProcessStandardItem } from '../entities/ProcessStandardItem';
import { QualityStandardItem } from '../entities/QualityStandardItem';
import { StandardCardMaterial } from '../entities/StandardCardMaterial';
import { StandardCardInk } from '../entities/StandardCardInk';
import { StandardCardTooling } from '../entities/StandardCardTooling';
import { StandardCardAttachment } from '../entities/StandardCardAttachment';
import { VersionChangeLog } from '../entities/VersionChangeLog';

export interface StandardCardFilters {
  code?: string;
  name?: string;
  type?: StandardCardType;
  status?: string;
  materialId?: number;
  customerId?: number;
  isCurrent?: boolean;
  isObsolete?: boolean;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  createUserId?: number;
}

export interface IStandardCardRepository {
  findById(id: number): Promise<StandardCard | null>;
  findByCode(code: string): Promise<StandardCard | null>;
  findByMaterialId(materialId: number, includeObsolete?: boolean): Promise<StandardCard[]>;
  findCurrentByMaterialId(materialId: number): Promise<StandardCard | null>;
  findByFilters(
    filters: StandardCardFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ list: StandardCard[]; total: number }>;
  save(card: StandardCard): Promise<number>;
  update(card: StandardCard): Promise<void>;
  delete(id: number): Promise<void>;
  exists(code: string): Promise<boolean>;
  getNextSequence(type: StandardCardType): Promise<string>;
}

export interface IColorStandardItemRepository {
  findByStandardCardId(standardCardId: number): Promise<ColorStandardItem[]>;
  saveBatch(standardCardId: number, items: ColorStandardItem[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IProcessStandardItemRepository {
  findByStandardCardId(standardCardId: number): Promise<ProcessStandardItem[]>;
  saveBatch(standardCardId: number, items: ProcessStandardItem[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IQualityStandardItemRepository {
  findByStandardCardId(standardCardId: number): Promise<QualityStandardItem[]>;
  saveBatch(standardCardId: number, items: QualityStandardItem[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardMaterialRepository {
  findByStandardCardId(standardCardId: number): Promise<StandardCardMaterial[]>;
  saveBatch(standardCardId: number, materials: StandardCardMaterial[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardInkRepository {
  findByStandardCardId(standardCardId: number): Promise<StandardCardInk[]>;
  saveBatch(standardCardId: number, inks: StandardCardInk[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardToolingRepository {
  findByStandardCardId(standardCardId: number): Promise<StandardCardTooling[]>;
  saveBatch(standardCardId: number, toolings: StandardCardTooling[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardAttachmentRepository {
  findByStandardCardId(standardCardId: number): Promise<StandardCardAttachment[]>;
  save(standardCardId: number, attachment: StandardCardAttachment): Promise<number>;
  delete(id: number): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IVersionChangeLogRepository {
  findByStandardCardId(standardCardId: number): Promise<VersionChangeLog[]>;
  save(log: VersionChangeLog): Promise<void>;
}
