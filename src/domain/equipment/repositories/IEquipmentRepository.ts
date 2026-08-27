import { Equipment, EquipmentStatus, EquipmentType } from '../aggregates/Equipment';

export interface IEquipmentRepository {
  getById(id: number): Promise<Equipment | null>;
  getByCode(equipmentCode: string): Promise<Equipment | null>;
  existsByCode(equipmentCode: string): Promise<boolean>;
  findAll(params?: {
    keyword?: string;
    equipmentType?: EquipmentType;
    status?: EquipmentStatus;
    workshop?: string;
  }): Promise<Equipment[]>;
  save(equipment: Equipment): Promise<number>;
  update(equipment: Equipment): Promise<void>;
  softDelete(id: number): Promise<void>;
  generateEquipmentCode(): Promise<string>;
}
