import { StandardCard } from '../aggregates/StandardCard';
import { StandardCardType } from '../value-objects/StandardCardType';

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
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, items: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IProcessStandardItemRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, items: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IQualityStandardItemRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, items: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardMaterialRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, materials: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardInkRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, inks: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardToolingRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  saveBatch(standardCardId: number, toolings: Loose[]): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IStandardCardAttachmentRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  save(standardCardId: number, attachment: Loose): Promise<number>;
  delete(id: number): Promise<void>;
  deleteByStandardCardId(standardCardId: number): Promise<void>;
}

export interface IVersionChangeLogRepository {
  findByStandardCardId(standardCardId: number): Promise<Loose[]>;
  save(log: Loose): Promise<void>;
}
