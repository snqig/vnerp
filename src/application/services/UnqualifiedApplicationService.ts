import {
  IUnqualifiedRepository,
  Pagination,
  PaginatedResult,
  UnqualifiedFilters,
} from '@/domain/quality/repositories/IUnqualifiedRepository';
import {
  UnqualifiedProduct,
  UnqualifiedProductProps,
} from '@/domain/quality/aggregates/UnqualifiedProduct';
import { HandleMethodValue } from '@/domain/quality/value-objects/HandleMethod';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export interface CreateRecordInput {
  inspectionId: number;
  sourceType?: string;
  sourceNo?: string;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  defectType?: string;
  defectDesc?: string;
  handleType?: HandleMethodValue;
  responsibleDept?: string;
  responsiblePerson?: string;
  remark?: string;
  createBy?: number;
}

export interface StartHandleInput {
  id: number;
  handleType: HandleMethodValue;
  responsibleDept: string;
  responsiblePerson: string;
  updateBy?: number;
}

export interface CompleteHandleInput {
  id: number;
  handler: string;
  handleResult: number;
  costAmount: number;
  updateBy?: number;
}

export class UnqualifiedApplicationService {
  constructor(private readonly repo: IUnqualifiedRepository) {}

  async getRecordById(id: number): Promise<UnqualifiedProduct> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundError('不合格品记录不存在');
    }
    return record;
  }

  async listRecords(
    status: string,
    pagination: Pagination,
    filters?: UnqualifiedFilters
  ): Promise<PaginatedResult<UnqualifiedProduct>> {
    return this.repo.findByStatus(status, pagination, filters);
  }

  async createRecord(input: CreateRecordInput): Promise<{
    id: number;
    unqualifiedNo: string;
    handleNo: string;
  }> {
    const props: UnqualifiedProductProps = {
      inspectionId: input.inspectionId,
      sourceType: input.sourceType,
      sourceNo: input.sourceNo,
      materialId: input.materialId,
      materialCode: input.materialCode,
      materialName: input.materialName,
      quantity: input.quantity,
      defectType: input.defectType,
      defectDesc: input.defectDesc,
      handleType: input.handleType,
      responsibleDept: input.responsibleDept,
      responsiblePerson: input.responsiblePerson,
      remark: input.remark,
      createBy: input.createBy,
    };

    const record = UnqualifiedProduct.create(props);
    const result = await this.repo.save(record);

    record.clearDomainEvents();

    return result;
  }

  async startHandle(input: StartHandleInput): Promise<{ id: number; status: string }> {
    const record = await this.getRecordById(input.id);

    const previousStatus = record.status.value;
    record.startHandle(input.handleType, input.responsibleDept, input.responsiblePerson);

    const updated = await this.repo.updateStatus(
      input.id,
      record.status.value,
      previousStatus,
      input.updateBy
    );
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.repo.updateHandleInfo(input.id, {
      handleType: record.handleType?.toDbCode(),
      responsibleDept: record.responsibleDept,
      responsiblePerson: record.responsiblePerson,
      updateBy: input.updateBy,
    });

    await this.persistAndPublishEvents(input.id, record);

    return { id: input.id, status: record.status.value };
  }

  async completeHandle(input: CompleteHandleInput): Promise<{ id: number; status: string }> {
    const record = await this.getRecordById(input.id);

    const previousStatus = record.status.value;
    record.completeHandle(input.handler, input.handleResult, input.costAmount);

    const updated = await this.repo.updateStatus(
      input.id,
      record.status.value,
      previousStatus,
      input.updateBy
    );
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.repo.updateHandleInfo(input.id, {
      handler: record.handler,
      handleResult: record.handleResult,
      costAmount: record.costAmount,
      handleDate: record.handleDate,
      updateBy: input.updateBy,
    });

    await this.persistAndPublishEvents(input.id, record);

    return { id: input.id, status: record.status.value };
  }

  async deleteRecord(id: number): Promise<void> {
    const record = await this.getRecordById(id);

    if (!record.canDelete()) {
      throw new DomainError(`当前状态"${record.status.label()}"的不合格品记录不能删除`);
    }

    await this.repo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateId: number,
    record: UnqualifiedProduct
  ): Promise<void> {
    const events = record.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'UnqualifiedProduct', aggregateId, events);
    });

    record.clearDomainEvents();
  }
}
