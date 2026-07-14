import { DomainEvent } from '@/domain/shared/DomainEvent';
import {
  EquipmentCreatedEvent,
  EquipmentStatusChangedEvent,
  EquipmentMaintenanceStartedEvent,
  EquipmentMaintenanceCompletedEvent,
  EquipmentScrappedEvent,
} from '../events/EquipmentEvents';

export enum EquipmentType {
  PRINTING = 'printing',
  DIE_CUTTING = 'die_cutting',
  LAMINATING = 'laminating',
  SLITTING = 'slitting',
  OTHER = 'other',
}

export enum EquipmentStatus {
  RUNNING = 1,
  STOPPED = 2,
  MAINTENANCE = 3,
  SCRAPPED = 4,
}

export class Equipment {
  private _events: DomainEvent[] = [];

  constructor(
    public id: number | undefined,
    public equipmentCode: string,
    public equipmentName: string,
    public equipmentType: EquipmentType,
    public model: string,
    public manufacturer: string,
    public workshop: string,
    public location: string,
    public purchaseDate: string | undefined,
    public installDate: string | undefined,
    public purchasePrice: number,
    public expectedLifeYears: number,
    public status: EquipmentStatus = EquipmentStatus.RUNNING,
    public cumulativeRunHours: number = 0,
    public cumulativePrintCount: number = 0,
    public lastMaintenanceDate: string | undefined,
    public nextMaintenanceDate: string | undefined,
    public remark: string = ''
  ) {}

  static register(props: {
    equipmentCode: string;
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
  }): Equipment {
    const eq = new Equipment(
      undefined,
      props.equipmentCode,
      props.equipmentName,
      props.equipmentType,
      props.model || '',
      props.manufacturer || '',
      props.workshop || '',
      props.location || '',
      props.purchaseDate,
      props.installDate,
      props.purchasePrice || 0,
      props.expectedLifeYears || 10,
      EquipmentStatus.RUNNING,
      0,
      0,
      undefined,
      undefined,
      props.remark || ''
    );
    eq._events.push(
      new EquipmentCreatedEvent({
        equipmentCode: props.equipmentCode,
        equipmentName: props.equipmentName,
      })
    );
    return eq;
  }

  changeStatus(newStatus: EquipmentStatus): void {
    if (this.status === EquipmentStatus.SCRAPPED) {
      throw new Error('已报废设备无法变更状态');
    }
    if (this.status === newStatus) return;
    const oldStatus = this.status;
    this.status = newStatus;
    this._events.push(
      new EquipmentStatusChangedEvent({
        equipmentId: this.id,
        oldStatus: EquipmentStatus[oldStatus],
        newStatus: EquipmentStatus[newStatus],
      })
    );
  }

  startMaintenance(): void {
    if (this.status === EquipmentStatus.SCRAPPED) {
      throw new Error('已报废设备无法维修');
    }
    if (this.status === EquipmentStatus.MAINTENANCE) {
      throw new Error('设备已在维修中');
    }
    const oldStatus = this.status;
    this.status = EquipmentStatus.MAINTENANCE;
    this._events.push(
      new EquipmentMaintenanceStartedEvent({
        equipmentId: this.id,
        equipmentCode: this.equipmentCode,
        previousStatus: EquipmentStatus[oldStatus],
      })
    );
  }

  completeMaintenance(maintenanceDate: string, nextMaintenanceDate?: string): void {
    if (this.status !== EquipmentStatus.MAINTENANCE) {
      throw new Error('设备不在维修状态');
    }
    this.status = EquipmentStatus.RUNNING;
    this.lastMaintenanceDate = maintenanceDate;
    if (nextMaintenanceDate) {
      this.nextMaintenanceDate = nextMaintenanceDate;
    }
    this._events.push(
      new EquipmentMaintenanceCompletedEvent({
        equipmentId: this.id,
        equipmentCode: this.equipmentCode,
        maintenanceDate,
      })
    );
  }

  scrap(): void {
    if (this.status === EquipmentStatus.SCRAPPED) {
      throw new Error('设备已报废');
    }
    this.status = EquipmentStatus.SCRAPPED;
    this._events.push(
      new EquipmentScrappedEvent({
        equipmentId: this.id,
        equipmentCode: this.equipmentCode,
      })
    );
  }

  addRunHours(hours: number): void {
    this.cumulativeRunHours += hours;
  }

  addPrintCount(count: number): void {
    this.cumulativePrintCount += count;
  }

  getDomainEvents(): DomainEvent[] {
    return this._events;
  }

  clearDomainEvents(): void {
    this._events = [];
  }
}
