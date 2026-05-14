import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  PaginationSchema,
  InboundCreateSchema,
  OutboundCreateSchema,
  WorkOrderCreateSchema,
  QualityInspectionSchema,
  validateWithZod,
} from './validation-schemas';

describe('RegisterSchema', () => {
  it('valid data passes', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('valid data with all fields passes', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: 'password123',
      real_name: 'Test User',
      email: 'test@example.com',
      phone: '13800138000',
      department_id: 1,
      role_id: 2,
    });
    expect(result.success).toBe(true);
  });

  it('username too short fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'ab',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('username too long fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'a'.repeat(21),
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('username with special characters fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'test@user',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('password too short fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('invalid email fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: 'password123',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('invalid phone fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: 'password123',
      phone: '12345678901',
    });
    expect(result.success).toBe(false);
  });

  it('missing username fails', () => {
    const result = RegisterSchema.safeParse({
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('missing password fails', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('valid data passes', () => {
    const result = LoginSchema.safeParse({
      username: 'admin',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('missing username fails', () => {
    const result = LoginSchema.safeParse({
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('missing password fails', () => {
    const result = LoginSchema.safeParse({
      username: 'admin',
    });
    expect(result.success).toBe(false);
  });
});

describe('PaginationSchema', () => {
  it('defaults to page=1, pageSize=20', () => {
    const result = PaginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts valid page and pageSize', () => {
    const result = PaginationSchema.safeParse({ page: 2, pageSize: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it('pageSize > 100 fails', () => {
    const result = PaginationSchema.safeParse({ page: 1, pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('page < 1 fails', () => {
    const result = PaginationSchema.safeParse({ page: 0, pageSize: 20 });
    expect(result.success).toBe(false);
  });

  it('pageSize < 1 fails', () => {
    const result = PaginationSchema.safeParse({ page: 1, pageSize: 0 });
    expect(result.success).toBe(false);
  });
});

describe('InboundCreateSchema', () => {
  const validData = {
    warehouse_id: 1,
    inbound_date: '2025-06-01',
    items: [
      {
        material_id: 1,
        material_name: 'Material A',
        quantity: 100,
        unit: '个',
        unit_price: 10.5,
      },
    ],
  };

  it('valid data passes', () => {
    const result = InboundCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('empty items is allowed by schema', () => {
    const result = InboundCreateSchema.safeParse({
      ...validData,
      items: [],
    });
    expect(result.success).toBe(true);
  });

  it('missing warehouse_id fails', () => {
    const { warehouse_id, ...withoutWarehouse } = validData;
    const result = InboundCreateSchema.safeParse(withoutWarehouse);
    expect(result.success).toBe(false);
  });

  it('missing inbound_date fails', () => {
    const { inbound_date, ...withoutDate } = validData;
    const result = InboundCreateSchema.safeParse(withoutDate);
    expect(result.success).toBe(false);
  });
});

describe('OutboundCreateSchema', () => {
  const validData = {
    warehouseId: 1,
    warehouseCode: 'WH001',
    warehouseName: 'Main Warehouse',
    items: [
      {
        material_id: 1,
        material_name: 'Material A',
        quantity: 50,
        unit: '个',
      },
    ],
    operatorId: 1,
    operatorName: 'Admin',
    orderDate: '2025-06-01',
  };

  it('valid data passes', () => {
    const result = OutboundCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('missing items fails', () => {
    const { items, ...withoutItems } = validData;
    const result = OutboundCreateSchema.safeParse(withoutItems);
    expect(result.success).toBe(false);
  });

  it('empty items is allowed by schema', () => {
    const result = OutboundCreateSchema.safeParse({
      ...validData,
      items: [],
    });
    expect(result.success).toBe(true);
  });

  it('missing warehouseId fails', () => {
    const { warehouseId, ...withoutWarehouse } = validData;
    const result = OutboundCreateSchema.safeParse(withoutWarehouse);
    expect(result.success).toBe(false);
  });
});

describe('WorkOrderCreateSchema', () => {
  const validData = {
    order_no: 'ORD-001',
    items: [
      {
        material_id: 1,
        material_name: 'Material A',
        quantity: 200,
        unit: '个',
      },
    ],
  };

  it('valid data passes', () => {
    const result = WorkOrderCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('valid data with all optional fields passes', () => {
    const result = WorkOrderCreateSchema.safeParse({
      ...validData,
      customer_name: 'Acme Corp',
      bom_id: 1,
      plan_start_date: '2025-06-01',
      plan_end_date: '2025-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('empty items is allowed by schema', () => {
    const result = WorkOrderCreateSchema.safeParse({
      ...validData,
      items: [],
    });
    expect(result.success).toBe(true);
  });

  it('missing order_no fails', () => {
    const { order_no, ...withoutOrderNo } = validData;
    const result = WorkOrderCreateSchema.safeParse(withoutOrderNo);
    expect(result.success).toBe(false);
  });
});

describe('QualityInspectionSchema', () => {
  const validData = {
    cardId: 1,
    inspectResult: 'pass',
  };

  it('valid data passes', () => {
    const result = QualityInspectionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('valid data with all fields passes', () => {
    const result = QualityInspectionSchema.safeParse({
      ...validData,
      qualifiedQty: 95,
      defectQty: 5,
      inspector: 'John',
      remark: 'Looks good',
    });
    expect(result.success).toBe(true);
  });

  it('invalid inspectResult fails', () => {
    const result = QualityInspectionSchema.safeParse({
      ...validData,
      inspectResult: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });

  it('all valid inspect results pass', () => {
    const validResults = ['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap'];
    for (const inspectResult of validResults) {
      const result = QualityInspectionSchema.safeParse({
        cardId: 1,
        inspectResult,
      });
      expect(result.success).toBe(true);
    }
  });

  it('missing cardId fails', () => {
    const result = QualityInspectionSchema.safeParse({
      inspectResult: 'pass',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateWithZod', () => {
  it('returns success for valid data', () => {
    const result = validateWithZod(LoginSchema, {
      username: 'admin',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('admin');
    }
  });

  it('returns errors array for invalid data', () => {
    const result = validateWithZod(RegisterSchema, {
      username: 'ab',
      password: '123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('errors contain path information', () => {
    const result = validateWithZod(RegisterSchema, {
      username: 'ab',
      password: '123',
    });
    if (!result.success) {
      const hasUsernameError = result.errors.some((e) => e.includes('username'));
      expect(hasUsernameError).toBe(true);
    }
  });
});
