import { Tool } from '../aggregates/Tool';

export interface IToolRepository {
  findById(id: number): Promise<Tool | null>;
  findByCode(toolCode: string): Promise<Tool | null>;
  findList(params: {
    toolType?: number;
    status?: number;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<{ list: Tool[]; total: number }>;
  save(tool: Tool): Promise<number>;
  update(tool: Tool): Promise<void>;
  softDelete(id: number): Promise<void>;
  existsByCode(toolCode: string, excludeId?: number): Promise<boolean>;
  countByStatus(): Promise<{
    total: number;
    active: number;
    warning: number;
    maintenance: number;
    scrapped: number;
    totalNetValue: number;
  }>;
}
