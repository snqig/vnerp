import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { randomUUID } from 'crypto';

let _seq = 0;
function nextSeq(): string {
  _seq = (_seq + 1) % 100000;
  return String(_seq).padStart(5, '0');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

export function generateOrderNo(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = nextSeq();
  return `${prefix}${year}${month}${day}${seq}`;
}

export function generateTransNo(prefix: string = 'TRX'): string {
  const now = new Date();
  const ts = now.getTime();
  const seq = nextSeq();
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}${ts}${seq}${rand}`;
}

export function generateBatchNo(warehouseCode: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = nextSeq();
  return `${warehouseCode}${year}${month}${day}${seq}`;
}

// 生成二维码内容
export function generateQRCode(type: string, id: string | number): string {
  return `DCERP:${type}:${id}:${Date.now()}`;
}

// 解析二维码内容
export function parseQRCode(qrCode: string): { type: string; id: string; timestamp: number } | null {
  const parts = qrCode.split(':');
  if (parts.length !== 4 || parts[0] !== 'DCERP') {
    return null;
  }
  return {
    type: parts[1],
    id: parts[2],
    timestamp: parseInt(parts[3]),
  };
}

// 格式化日期
export function formatDate(date: Date | string | null | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

// 格式化金额
export function formatAmount(amount: number | string, decimals: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// 格式化数量
export function formatQuantity(quantity: number | string, decimals: number = 4): string {
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(num)) return '0';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// 计算效率百分比
export function calculateEfficiency(actualTime: number, standardTime: number): number {
  if (actualTime <= 0 || standardTime <= 0) return 0;
  return Math.round((standardTime / actualTime) * 100);
}

// 判断是否需要效率预警
export function needsEfficiencyWarning(efficiency: number, threshold: number = 80): boolean {
  return efficiency < threshold;
}

// 计算批次有效期
export function calculateExpiryDate(productionDate: Date, shelfLifeDays: number): Date {
  const expiry = new Date(productionDate);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry;
}

// 比较日期（用于先进先出）
export function compareDate(a: Date | string, b: Date | string): number {
  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();
  return dateA - dateB;
}

// 获取状态配置
export function getStatusConfig(status: string, statusList: readonly { value: string; label: string; color?: string }[]): { label: string; color: string } {
  const found = statusList.find(s => s.value === status);
  return found ? { label: found.label, color: found.color || 'default' } : { label: status, color: 'default' };
}
