// 员工接口
export interface Employee {
  id: number;
  employee_no: string;
  name: string;
  gender: number;
  age?: number;
  id_card?: string;
  phone: string;
  email: string;
  dept_id: number;
  dept_name: string;
  section?: string;
  role_id: number;
  role_name: string;
  position: string;
  entry_date: string;
  birth_date?: string;
  native_place?: string;
  home_address?: string;
  current_address?: string;
  birth_month?: string;
  id_card_expiry?: string;
  education?: string;
  status: number;
  remark?: string;
  photo?: string;
}

// 部门接口
export interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
}

// 角色接口
export interface Role {
  id: number;
  role_code: string;
  role_name: string;
}
