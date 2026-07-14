import { Die, DieStatusValue } from '../aggregates/Die';

export interface IDieRepository {
  getById(id: number): Promise<Die | null>;
  getByCode(code: string): Promise<Die | null>;
  existsByCode(code: string, excludeId?: number): Promise<boolean>;
  findAll(params?: {
    keyword?: string;
    templateType?: number;
    assetType?: string;
    dieStatus?: DieStatusValue;
    status?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Die[]; total: number }>;
  findWarningList(): Promise<Die[]>;
  getDashboardStats(): Promise<Record<string, unknown>>;
  getTypeStats(): Promise<Record<string, unknown>[]>;
  save(die: Die): Promise<number>;
  update(die: Die): Promise<void>;
  softDelete(id: number): Promise<void>;
}
