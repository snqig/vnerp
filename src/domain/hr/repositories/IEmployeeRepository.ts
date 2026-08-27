import { Employee, EmployeeStatus } from '../aggregates/Employee';

export interface IEmployeeRepository {
  getById(id: number): Promise<Employee | null>;
  getByEmployeeNo(employeeNo: string): Promise<Employee | null>;
  existsByEmployeeNo(employeeNo: string): Promise<boolean>;
  findAll(status?: EmployeeStatus, deptId?: number): Promise<Employee[]>;
  save(employee: Employee): Promise<number>;
  update(employee: Employee): Promise<void>;
  softDelete(id: number): Promise<void>;
  generateEmployeeNo(): Promise<string>;
}
