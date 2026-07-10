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
  updateBasicInfo(
    id: number,
    data: Partial<{
      toolName: string;
      spec: string;
      materialId: number;
      totalLife: number;
      warningThreshold: number;
      manufactureDate: string;
      warehouseLocation: string;
      assetType: string;
      layoutType: string;
      piecesPerImpression: number;
      material: string;
      qrCode: string;
      supplierId: number;
      maintenanceInterval: number;
      meshCount: string;
      meshMaterial: string;
      size: string;
      tensionValue: number;
      frameType: string;
      customerId: number;
      remark: string;
    }>
  ): Promise<void>;
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
