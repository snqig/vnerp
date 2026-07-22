import { DomainEvent } from '@/domain/shared/DomainEvent';

export enum EmployeeStatus {
  ONBOARDING = 'onboarding',
  PROBATION = 'probation',
  CONFIRMED = 'confirmed',
  SUSPENDED = 'suspended',
  RESIGNED = 'resigned',
}

export class Employee {
  private _events: DomainEvent[] = [];

  constructor(
    public id: number | undefined,
    public employeeNo: string,
    public name: string,
    public gender: 'M' | 'F',
    public phone: string,
    public email: string,
    public deptId: number,
    public positionId: number,
    public baseSalary: number,
    public positionAllowance: number,
    public entryDate: Date,
    public probationEnd: Date | undefined,
    public resignDate: Date | undefined,
    public status: EmployeeStatus = EmployeeStatus.ONBOARDING,
    public emergencyContact: string = '',
    public remark: string = ''
  ) {}

  static onboard(props: {
    employeeNo: string;
    name: string;
    gender: 'M' | 'F';
    phone: string;
    email: string;
    deptId: number;
    positionId: number;
    baseSalary: number;
    positionAllowance: number;
    emergencyContact?: string;
    remark?: string;
  }): Employee {
    const emp = new Employee(
      undefined,
      props.employeeNo,
      props.name,
      props.gender,
      props.phone,
      props.email,
      props.deptId,
      props.positionId,
      props.baseSalary,
      props.positionAllowance,
      new Date(),
      new Date(new Date().setMonth(new Date().getMonth() + 3)),
      undefined,
      EmployeeStatus.ONBOARDING,
      props.emergencyContact || '',
      props.remark || ''
    );
    return emp;
  }

  confirm(_confirmedBy: number): void {
    if (this.status !== EmployeeStatus.PROBATION && this.status !== EmployeeStatus.ONBOARDING) {
      throw new Error('只有试用期员工可转正');
    }
    this.status = EmployeeStatus.CONFIRMED;
  }

  transfer(newDeptId: number, newPositionId: number): void {
    if (this.status === EmployeeStatus.RESIGNED) {
      throw new Error('已离职员工无法调岗');
    }
    this.deptId = newDeptId;
    this.positionId = newPositionId;
  }

  resign(resignDate: Date, reason: string): void {
    if (this.status === EmployeeStatus.RESIGNED) {
      throw new Error('员工已离职');
    }
    this.status = EmployeeStatus.RESIGNED;
    this.resignDate = resignDate;
    this.remark = reason;
  }

  suspend(): void {
    this.status = EmployeeStatus.SUSPENDED;
  }

  getDomainEvents(): DomainEvent[] {
    return this._events;
  }
  clearDomainEvents(): void {
    this._events = [];
  }
}
