import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';

/** 样单查询筛选条件 */
export interface SampleOrderFilters {
  /** 按单号模糊搜索 */
  orderNo?: string;
  /** 客户ID */
  customerId?: number;
  /** 状态筛选 */
  status?: SampleOrderStatus;
  /** 创建日期起始 (含) */
  dateFrom?: Date;
  /** 创建日期截止 (含) */
  dateTo?: Date;
  /** 关键字搜索 (匹配单号/联系人/产品描述) */
  keyword?: string;
}

/** 样单仓储接口 */
export interface ISampleOrderRepository {
  /** 根据主键ID查询 */
  findById(id: number): Promise<SampleOrder | null>;

  /** 根据单号查询 */
  findByOrderNo(orderNo: string): Promise<SampleOrder | null>;

  /** 按条件分页查询 */
  findByFilters(
    filters: SampleOrderFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ list: SampleOrder[]; total: number }>;

  /** 保存新样单，返回自增ID */
  save(order: SampleOrder): Promise<number>;

  /** 更新已有样单 */
  update(order: SampleOrder): Promise<void>;

  /** 删除样单 (仅草稿状态) */
  delete(id: number): Promise<void>;

  /** 判断单号是否已存在 */
  exists(orderNo: string): Promise<boolean>;

  /** 获取下一个序号 (用于生成单号) */
  getNextSequence(): Promise<string>;
}
