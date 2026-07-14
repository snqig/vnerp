import { IEquipmentRepository } from '@/domain/equipment/repositories/IEquipmentRepository';
import { Equipment, EquipmentStatus, EquipmentType } from '@/domain/equipment/aggregates/Equipment';

export class EquipmentApplicationService {
  constructor(private equipmentRepo: IEquipmentRepository) {}

  async register(props: {
    equipmentCode?: string;
    equipmentName: string;
    equipmentType: EquipmentType;
    model?: string;
    manufacturer?: string;
    workshop?: string;
    location?: string;
    purchaseDate?: string;
    installDate?: string;
    purchasePrice?: number;
    expectedLifeYears?: number;
    remark?: string;
  }): Promise<Equipment> {
    const equipmentCode = props.equipmentCode || (await this.equipmentRepo.generateEquipmentCode());
    const exists = await this.equipmentRepo.existsByCode(equipmentCode);
    if (exists) throw new Error(`设备编号 ${equipmentCode} 已存在`);
    const equipment = Equipment.register({ ...props, equipmentCode });
    const id = await this.equipmentRepo.save(equipment);
    return new Equipment(
      id,
      equipment.equipmentCode,
      equipment.equipmentName,
      equipment.equipmentType,
      equipment.model,
      equipment.manufacturer,
      equipment.workshop,
      equipment.location,
      equipment.purchaseDate,
      equipment.installDate,
      equipment.purchasePrice,
      equipment.expectedLifeYears,
      equipment.status,
      equipment.cumulativeRunHours,
      equipment.cumulativePrintCount,
      equipment.lastMaintenanceDate,
      equipment.nextMaintenanceDate,
      equipment.remark
    );
  }

  async changeStatus(equipmentId: number, newStatus: EquipmentStatus): Promise<void> {
    const equipment = await this.equipmentRepo.getById(equipmentId);
    if (!equipment) throw new Error('设备不存在');
    equipment.changeStatus(newStatus);
    await this.equipmentRepo.update(equipment);
  }

  async startMaintenance(equipmentId: number): Promise<void> {
    const equipment = await this.equipmentRepo.getById(equipmentId);
    if (!equipment) throw new Error('设备不存在');
    equipment.startMaintenance();
    await this.equipmentRepo.update(equipment);
  }

  async completeMaintenance(
    equipmentId: number,
    maintenanceDate: string,
    nextMaintenanceDate?: string
  ): Promise<void> {
    const equipment = await this.equipmentRepo.getById(equipmentId);
    if (!equipment) throw new Error('设备不存在');
    equipment.completeMaintenance(maintenanceDate, nextMaintenanceDate);
    await this.equipmentRepo.update(equipment);
  }

  async scrap(equipmentId: number): Promise<void> {
    const equipment = await this.equipmentRepo.getById(equipmentId);
    if (!equipment) throw new Error('设备不存在');
    equipment.scrap();
    await this.equipmentRepo.update(equipment);
  }

  async getById(id: number): Promise<Equipment | null> {
    return this.equipmentRepo.getById(id);
  }

  async list(params?: {
    keyword?: string;
    equipmentType?: EquipmentType;
    status?: EquipmentStatus;
    workshop?: string;
  }): Promise<Equipment[]> {
    return this.equipmentRepo.findAll(params);
  }

  async softDelete(id: number): Promise<void> {
    await this.equipmentRepo.softDelete(id);
  }
}
