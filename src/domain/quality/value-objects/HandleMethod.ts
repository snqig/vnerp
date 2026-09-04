import { t } from '@/lib/server-translate';

import { DomainError } from '../../shared/DomainTypes';

export type HandleMethodValue = 'rework' | 'scrap' | 'concession' | 'return';

export class HandleMethod {
  private constructor(public readonly value: HandleMethodValue) {}

  static rework(): HandleMethod {
    return new HandleMethod('rework');
  }
  static scrap(): HandleMethod {
    return new HandleMethod('scrap');
  }
  static concession(): HandleMethod {
    return new HandleMethod('concession');
  }
  static return(): HandleMethod {
    return new HandleMethod('return');
  }

  static from(value: string): HandleMethod {
    const validMethods: HandleMethodValue[] = ['rework', 'scrap', 'concession', 'return'];
    if (!validMethods.includes(value as HandleMethodValue)) {
      throw new DomainError(`无效的处理方式: ${value}`);
    }
    return new HandleMethod(value as HandleMethodValue);
  }

  static fromDbCode(code: number): HandleMethod {
    const map: Record<number, HandleMethodValue> = {
      1: 'rework',
      2: 'scrap',
      3: 'concession',
      4: 'return',
    };
    const method = map[code];
    if (!method) {
      throw new DomainError(`无效的处理方式码: ${code}`);
    }
    return new HandleMethod(method);
  }

  toDbCode(): number {
    const map: Record<HandleMethodValue, number> = {
      rework: 1,
      scrap: 2,
      concession: 3,
      return: 4,
    };
    return map[this.value];
  }

  label(): string {
  const ts = t;
    const labels: Record<HandleMethodValue, string> = {
      rework: ts('k_r5apxu'),
      scrap: ts('k_19qx965'),
      concession: ts('k_m3wj5o'),
      return: ts('k_1il6wq0'),
    };
    return labels[this.value];
  }

  equals(other: HandleMethod): boolean {
    return this.value === other.value;
  }
}
