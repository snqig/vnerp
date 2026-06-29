import { StandardCard } from '@/domain/standard-card/aggregates/StandardCard';
import { StandardCardType } from '@/domain/standard-card/value-objects/StandardCardType';
import { StandardCardStatus } from '@/domain/standard-card/value-objects/StandardCardStatus';
import {
  StandardCardCreatedEvent,
  StandardCardSubmittedEvent,
  StandardCardApprovedEvent,
  StandardCardConfirmedEvent,
  StandardCardObsoletedEvent,
} from '@/domain/standard-card/events/StandardCardEvents';
import { getEventBus, EventBus } from '@/infrastructure/event-bus/EventBus';
import { secureLog } from '@/lib/logger';

export interface CreateStandardCardDTO {
  name: string;
  type: StandardCardType;
  materialId?: number;
  materialName?: string;
  customerId?: number;
  customerName?: string;
  spec?: string;
  effectiveDate?: string;
  qualityRequirement?: string;
  colorItems?: any[];
  processItems?: any[];
  qualityItems?: any[];
  materials?: any[];
  inks?: any[];
  toolings?: any[];
  remark?: string;
  userId: number;
}

export interface UpdateStandardCardDTO extends CreateStandardCardDTO {
  id: number;
  changeDescription?: string;
}

export interface StandardCardQueryDTO {
  code?: string;
  name?: string;
  type?: string;
  status?: string;
  materialId?: number;
  customerId?: number;
  isCurrent?: boolean;
  isObsolete?: boolean;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
  page?: number;
  pageSize?: number;
}

export class StandardCardApplicationService {
  private eventBus: EventBus;

  constructor() {
    this.eventBus = getEventBus();
  }

  async create(dto: CreateStandardCardDTO): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const seq = await repo.getNextSequence(dto.type);
    const code = `${dto.type.substring(0, 3).toUpperCase()}${seq}`;

    const card = new StandardCard({
      code,
      version: '1.0',
      name: dto.name,
      type: dto.type,
      materialId: dto.materialId,
      materialName: dto.materialName,
      customerId: dto.customerId,
      customerName: dto.customerName,
      spec: dto.spec,
      status: StandardCardStatus.DRAFT,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      isCurrent: false,
      isObsolete: false,
      isLocked: false,
      qualityRequirement: dto.qualityRequirement,
      createUser: dto.userId,
      remark: dto.remark,
    });

    if (dto.colorItems) {
      const { ColorStandardItem } =
        await import('@/domain/standard-card/entities/ColorStandardItem');
      card.setColorItems(dto.colorItems.map((item: any) => new ColorStandardItem(item)));
    }
    if (dto.processItems) {
      const { ProcessStandardItem } =
        await import('@/domain/standard-card/entities/ProcessStandardItem');
      card.setProcessItems(dto.processItems.map((item: any) => new ProcessStandardItem(item)));
    }
    if (dto.qualityItems) {
      const { QualityStandardItem } =
        await import('@/domain/standard-card/entities/QualityStandardItem');
      card.setQualityItems(dto.qualityItems.map((item: any) => new QualityStandardItem(item)));
    }
    if (dto.materials) {
      const { StandardCardMaterial } =
        await import('@/domain/standard-card/entities/StandardCardMaterial');
      card.setMaterials(dto.materials.map((item: any) => new StandardCardMaterial(item)));
    }
    if (dto.inks) {
      const { StandardCardInk } = await import('@/domain/standard-card/entities/StandardCardInk');
      card.setInks(dto.inks.map((item: any) => new StandardCardInk(item)));
    }
    if (dto.toolings) {
      const { StandardCardTooling } =
        await import('@/domain/standard-card/entities/StandardCardTooling');
      card.setToolings(dto.toolings.map((item: any) => new StandardCardTooling(item)));
    }

    const id = await repo.save(card);
    (card as any).id = id;

    await this.saveDetailItems(id, dto);

    const cardProps = card.toProps();
    cardProps.id = id;
    const savedCard = new StandardCard(cardProps);

    const event = new StandardCardCreatedEvent({
      standardCardId: id,
      code: card.code,
      version: card.version,
      name: card.name,
      type: card.type,
      materialId: dto.materialId,
      customerId: dto.customerId,
      userId: dto.userId,
    });
    // 1.5.1 publish 现在会抛错，fire-and-forget 模式需 .catch 避免 unhandled rejection
    this.eventBus.publish(event).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      secureLog('error', 'Standard card event publish failed', {
        eventType: event.eventType,
        error: errorMessage,
      });
    });

    return savedCard;
  }

  async update(dto: UpdateStandardCardDTO): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(dto.id);
    if (!card) {
      throw new Error('标准卡不存在');
    }
    if (card.isLocked) {
      throw new Error('已确认的标准卡不能修改');
    }

    const updatedCard = new StandardCard({
      ...card.toProps(),
      name: dto.name,
      type: dto.type,
      materialId: dto.materialId,
      materialName: dto.materialName,
      customerId: dto.customerId,
      customerName: dto.customerName,
      spec: dto.spec,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      qualityRequirement: dto.qualityRequirement,
      changeDescription: dto.changeDescription,
    });

    if (dto.colorItems) {
      const { ColorStandardItem } =
        await import('@/domain/standard-card/entities/ColorStandardItem');
      updatedCard.setColorItems(dto.colorItems.map((item: any) => new ColorStandardItem(item)));
    }
    if (dto.processItems) {
      const { ProcessStandardItem } =
        await import('@/domain/standard-card/entities/ProcessStandardItem');
      updatedCard.setProcessItems(
        dto.processItems.map((item: any) => new ProcessStandardItem(item))
      );
    }
    if (dto.qualityItems) {
      const { QualityStandardItem } =
        await import('@/domain/standard-card/entities/QualityStandardItem');
      updatedCard.setQualityItems(
        dto.qualityItems.map((item: any) => new QualityStandardItem(item))
      );
    }
    if (dto.materials) {
      const { StandardCardMaterial } =
        await import('@/domain/standard-card/entities/StandardCardMaterial');
      updatedCard.setMaterials(dto.materials.map((item: any) => new StandardCardMaterial(item)));
    }
    if (dto.inks) {
      const { StandardCardInk } = await import('@/domain/standard-card/entities/StandardCardInk');
      updatedCard.setInks(dto.inks.map((item: any) => new StandardCardInk(item)));
    }
    if (dto.toolings) {
      const { StandardCardTooling } =
        await import('@/domain/standard-card/entities/StandardCardTooling');
      updatedCard.setToolings(dto.toolings.map((item: any) => new StandardCardTooling(item)));
    }

    await repo.update(updatedCard);
    await this.saveDetailItems(dto.id, dto);

    return updatedCard;
  }

  async submit(id: number, userId: number): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }

    card.submit(userId);
    await repo.update(card);
    await this.saveVersionLogs(card);

    const event = new StandardCardSubmittedEvent({
      standardCardId: id,
      code: card.code,
      version: card.version,
      userId,
    });
    // 1.5.1 publish 现在会抛错，fire-and-forget 模式需 .catch 避免 unhandled rejection
    this.eventBus.publish(event).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      secureLog('error', 'Standard card event publish failed', {
        eventType: event.eventType,
        error: errorMessage,
      });
    });

    return card;
  }

  async approve(id: number, userId: number): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }

    card.approve(userId);
    await repo.update(card);
    await this.saveVersionLogs(card);

    const event = new StandardCardApprovedEvent({
      standardCardId: id,
      code: card.code,
      version: card.version,
      userId,
      approvalLevel: 'tech_manager',
    });
    // 1.5.1 publish 现在会抛错，fire-and-forget 模式需 .catch 避免 unhandled rejection
    this.eventBus.publish(event).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      secureLog('error', 'Standard card event publish failed', {
        eventType: event.eventType,
        error: errorMessage,
      });
    });

    return card;
  }

  async confirm(id: number, userId: number): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }

    const { VersionChangeLogRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const logRepo = new VersionChangeLogRepository();
    await logRepo.save({
      standardCardId: id,
      version: card.version,
      changeType: 'update',
      changeContent: '总经理审批通过',
      changedBy: userId,
    });

    card.confirm(userId);
    await repo.update(card);

    const event = new StandardCardConfirmedEvent({
      standardCardId: id,
      code: card.code,
      version: card.version,
      materialId: card.materialId,
      userId,
    });
    // 1.5.1 publish 现在会抛错，fire-and-forget 模式需 .catch 避免 unhandled rejection
    this.eventBus.publish(event).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      secureLog('error', 'Standard card event publish failed', {
        eventType: event.eventType,
        error: errorMessage,
      });
    });

    return card;
  }

  async obsolete(id: number, reason: string, userId: number): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }

    card.obsolete(userId, reason);
    await repo.update(card);
    await this.saveVersionLogs(card);

    const event = new StandardCardObsoletedEvent({
      standardCardId: id,
      code: card.code,
      version: card.version,
      reason,
      userId,
    });
    // 1.5.1 publish 现在会抛错，fire-and-forget 模式需 .catch 避免 unhandled rejection
    this.eventBus.publish(event).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      secureLog('error', 'Standard card event publish failed', {
        eventType: event.eventType,
        error: errorMessage,
      });
    });

    return card;
  }

  async createNewVersion(id: number, userId: number): Promise<StandardCard> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }

    const newCard = card.createNewVersion(StandardCard.generateVersion(card.version), userId);
    const newId = await repo.save(newCard);
    (newCard as any).id = newId;

    const {
      ColorStandardItemRepository,
      ProcessStandardItemRepository,
      QualityStandardItemRepository,
      StandardCardMaterialRepository,
      StandardCardInkRepository,
      StandardCardToolingRepository,
    } = await import('@/infrastructure/repositories/MysqlStandardCardRepository');

    const colorRepo = new ColorStandardItemRepository();
    const colorItems = await colorRepo.findByStandardCardId(id);
    if (colorItems.length > 0) {
      await colorRepo.saveBatch(
        newId,
        colorItems.map((item: any) => ({
          colorName: item.color_name,
          pantoneCode: item.pantone_code,
          cmykValue: item.cmyk_value,
          rgbValue: item.rgb_value,
          colorSampleImage: item.color_sample_image,
          tolerance: item.tolerance,
          remark: item.remark,
        }))
      );
    }

    return newCard;
  }

  async getById(id: number): Promise<StandardCard | null> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();
    return await repo.findById(id);
  }

  async getByCode(code: string): Promise<StandardCard | null> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();
    return await repo.findByCode(code);
  }

  async getByMaterialId(materialId: number, includeObsolete = false): Promise<StandardCard[]> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();
    return await repo.findByMaterialId(materialId, includeObsolete);
  }

  async getCurrentByMaterialId(materialId: number): Promise<StandardCard | null> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();
    return await repo.findCurrentByMaterialId(materialId);
  }

  async query(filters: StandardCardQueryDTO): Promise<{ list: StandardCard[]; total: number }> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    return await repo.findByFilters(
      {
        code: filters.code,
        name: filters.name,
        type: filters.type as StandardCardType | undefined,
        status: filters.status,
        materialId: filters.materialId,
        customerId: filters.customerId,
        isCurrent: filters.isCurrent,
        isObsolete: filters.isObsolete,
        effectiveDateFrom: filters.effectiveDateFrom
          ? new Date(filters.effectiveDateFrom)
          : undefined,
        effectiveDateTo: filters.effectiveDateTo ? new Date(filters.effectiveDateTo) : undefined,
      },
      filters.page || 1,
      filters.pageSize || 20
    );
  }

  async delete(id: number): Promise<void> {
    const { MysqlStandardCardRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new MysqlStandardCardRepository();

    const card = await repo.findById(id);
    if (!card) {
      throw new Error('标准卡不存在');
    }
    if (card.status !== StandardCardStatus.DRAFT) {
      throw new Error('只有草稿状态的标准卡才能删除');
    }

    const {
      ColorStandardItemRepository,
      ProcessStandardItemRepository,
      QualityStandardItemRepository,
      StandardCardMaterialRepository,
      StandardCardInkRepository,
      StandardCardToolingRepository,
      StandardCardAttachmentRepository,
    } = await import('@/infrastructure/repositories/MysqlStandardCardRepository');

    await Promise.all([
      new ColorStandardItemRepository().deleteByStandardCardId(id),
      new ProcessStandardItemRepository().deleteByStandardCardId(id),
      new QualityStandardItemRepository().deleteByStandardCardId(id),
      new StandardCardMaterialRepository().deleteByStandardCardId(id),
      new StandardCardInkRepository().deleteByStandardCardId(id),
      new StandardCardToolingRepository().deleteByStandardCardId(id),
      new StandardCardAttachmentRepository().deleteByStandardCardId(id),
    ]);

    await repo.delete(id);
  }

  async getDetailItems(standardCardId: number): Promise<any> {
    const {
      ColorStandardItemRepository,
      ProcessStandardItemRepository,
      QualityStandardItemRepository,
      StandardCardMaterialRepository,
      StandardCardInkRepository,
      StandardCardToolingRepository,
      StandardCardAttachmentRepository,
      VersionChangeLogRepository,
    } = await import('@/infrastructure/repositories/MysqlStandardCardRepository');

    const [
      colorItems,
      processItems,
      qualityItems,
      materials,
      inks,
      toolings,
      attachments,
      versionLogs,
    ] = await Promise.all([
      new ColorStandardItemRepository().findByStandardCardId(standardCardId),
      new ProcessStandardItemRepository().findByStandardCardId(standardCardId),
      new QualityStandardItemRepository().findByStandardCardId(standardCardId),
      new StandardCardMaterialRepository().findByStandardCardId(standardCardId),
      new StandardCardInkRepository().findByStandardCardId(standardCardId),
      new StandardCardToolingRepository().findByStandardCardId(standardCardId),
      new StandardCardAttachmentRepository().findByStandardCardId(standardCardId),
      new VersionChangeLogRepository().findByStandardCardId(standardCardId),
    ]);

    return {
      colorItems: colorItems.map((item: any) => ({
        id: item.id,
        colorName: item.color_name,
        pantoneCode: item.pantone_code,
        cmykValue: item.cmyk_value,
        rgbValue: item.rgb_value,
        colorSampleImage: item.color_sample_image,
        tolerance: item.tolerance,
        remark: item.remark,
      })),
      processItems: processItems.map((item: any) => ({
        id: item.id,
        processId: item.process_id,
        processName: item.process_name,
        processOrder: item.process_order,
        parameterName: item.parameter_name,
        standardValue: item.standard_value,
        tolerance: item.tolerance,
        unit: item.unit,
        standardTime: item.standard_time,
        machineType: item.machine_type,
        description: item.description,
        remark: item.remark,
      })),
      qualityItems: qualityItems.map((item: any) => ({
        id: item.id,
        inspectionItem: item.inspection_item,
        standardValue: item.standard_value,
        tolerance: item.tolerance,
        inspectionMethod: item.inspection_method,
        isKey: item.is_key === 1,
        defectLevel: item.defect_level,
        remark: item.remark,
      })),
      materials: materials.map((item: any) => ({
        id: item.id,
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        spec: item.spec,
        unitConsumption: item.unit_consumption,
        lossRate: item.loss_rate,
        remark: item.remark,
      })),
      inks: inks.map((item: any) => ({
        id: item.id,
        inkId: item.ink_id,
        inkCode: item.ink_code,
        inkName: item.ink_name,
        colorName: item.color_name,
        ratio: item.ratio,
        unitConsumption: item.unit_consumption,
        remark: item.remark,
      })),
      toolings: toolings.map((item: any) => ({
        id: item.id,
        dieMoldId: item.die_mold_id,
        screenPlateId: item.screen_plate_id,
        remark: item.remark,
      })),
      attachments: attachments.map((item: any) => ({
        id: item.id,
        fileName: item.file_name,
        filePath: item.file_path,
        fileSize: item.file_size,
        version: item.version,
        remark: item.remark,
        uploadedBy: item.uploaded_by,
        uploadedAt: item.uploaded_at,
      })),
      versionLogs: versionLogs.map((item: any) => ({
        id: item.id,
        version: item.version,
        changeType: item.change_type,
        changeContent: item.change_content,
        changedBy: item.changed_by,
        changedByName: item.changed_by_name,
        changedAt: item.changed_at,
      })),
    };
  }

  private async saveDetailItems(standardCardId: number, dto: any): Promise<void> {
    const {
      ColorStandardItemRepository,
      ProcessStandardItemRepository,
      QualityStandardItemRepository,
      StandardCardMaterialRepository,
      StandardCardInkRepository,
      StandardCardToolingRepository,
    } = await import('@/infrastructure/repositories/MysqlStandardCardRepository');

    const repos = {
      color: new ColorStandardItemRepository(),
      process: new ProcessStandardItemRepository(),
      quality: new QualityStandardItemRepository(),
      material: new StandardCardMaterialRepository(),
      ink: new StandardCardInkRepository(),
      tooling: new StandardCardToolingRepository(),
    };

    if (dto.colorItems) await repos.color.saveBatch(standardCardId, dto.colorItems);
    if (dto.processItems) await repos.process.saveBatch(standardCardId, dto.processItems);
    if (dto.qualityItems) await repos.quality.saveBatch(standardCardId, dto.qualityItems);
    if (dto.materials) await repos.material.saveBatch(standardCardId, dto.materials);
    if (dto.inks) await repos.ink.saveBatch(standardCardId, dto.inks);
    if (dto.toolings) await repos.tooling.saveBatch(standardCardId, dto.toolings);
  }

  private async saveVersionLogs(card: StandardCard): Promise<void> {
    const { VersionChangeLogRepository } =
      await import('@/infrastructure/repositories/MysqlStandardCardRepository');
    const repo = new VersionChangeLogRepository();

    for (const log of card.versionLogsNew) {
      await repo.save({
        standardCardId: card.id!,
        version: log.version,
        changeType: log.changeType,
        changeContent: log.changeContent,
        changedBy: log.changedBy,
      });
    }
  }
}
