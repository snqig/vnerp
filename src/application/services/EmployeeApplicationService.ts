import { IEmployeeRepository } from '@/domain/hr/repositories/IEmployeeRepository';
import { Employee } from '@/domain/hr/aggregates/Employee';

export class EmployeeApplicationService {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async onboard(props: {
    employeeNo?: string;
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
  }): Promise<Employee> {
    const employeeNo = props.employeeNo || (await this.employeeRepo.generateEmployeeNo());
    const exists = await this.employeeRepo.existsByEmployeeNo(employeeNo);
    if (exists) throw new Error(`工号 ${employeeNo} 已存在`);
    const employee = Employee.onboard({ ...props, employeeNo });
    const id = await this.employeeRepo.save(employee);
    return new Employee(
      id,
      employee.employeeNo,
      employee.name,
      employee.gender,
      employee.phone,
      employee.email,
      employee.deptId,
      employee.positionId,
      employee.baseSalary,
      employee.positionAllowance,
      employee.entryDate,
      employee.probationEnd,
      undefined,
      employee.status,
      employee.emergencyContact,
      employee.remark
    );
  }

  async confirm(employeeId: number, confirmedBy: number): Promise<void> {
    const employee = await this.employeeRepo.getById(employeeId);
    if (!employee) throw new Error('员工不存在');
    employee.confirm(confirmedBy);
    await this.employeeRepo.update(employee);
  }

  async transfer(employeeId: number, newDeptId: number, newPositionId: number): Promise<void> {
    const employee = await this.employeeRepo.getById(employeeId);
    if (!employee) throw new Error('员工不存在');
    employee.transfer(newDeptId, newPositionId);
    await this.employeeRepo.update(employee);
  }

  async resign(employeeId: number, resignDate: Date, reason: string): Promise<void> {
    const employee = await this.employeeRepo.getById(employeeId);
    if (!employee) throw new Error('员工不存在');
    employee.resign(resignDate, reason);
    await this.employeeRepo.update(employee);
  }

  async getById(id: number): Promise<Employee | null> {
    return this.employeeRepo.getById(id);
  }

  async list(status?: string, deptId?: number): Promise<Employee[]> {
    return this.employeeRepo.findAll(status as any, deptId);
  }
}
