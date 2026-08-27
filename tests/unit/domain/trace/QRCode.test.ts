import { describe, it, expect } from 'vitest';
import { QRCode, QR_TYPE, QR_STATUS } from '@/domain/trace/QRCode';
import { DomainError } from '@/domain/shared/DomainTypes';

describe('QRCode', () => {
  describe('create()', () => {
    it('valid props creates successfully', () => {
      const qr = QRCode.create({
        qrCode: 'QR-001',
        qrType: QR_TYPE.MATERIAL,
        batchNo: 'BATCH-001',
        quantity: 100,
        materialId: 1,
        materialName: 'Test Material',
      });
      expect(qr.qrCode).toBe('QR-001');
      expect(qr.qrType).toBe(QR_TYPE.MATERIAL);
      expect(qr.batchNo).toBe('BATCH-001');
      expect(qr.quantity).toBe(100);
      expect(qr.status).toBe(QR_STATUS.ACTIVE);
      expect(qr.parentQrCode).toBeNull();
      expect(qr.splitFlag).toBe(0);
    });

    it('throws if qrCode is empty', () => {
      expect(() => QRCode.create({ qrCode: '', qrType: QR_TYPE.MATERIAL })).toThrow(DomainError);
    });

    it('throws if qrType is empty', () => {
      expect(() => QRCode.create({ qrCode: 'QR-001', qrType: '' })).toThrow(DomainError);
    });

    it('throws if quantity is negative', () => {
      expect(() => QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL, quantity: -1 })).toThrow(DomainError);
    });

    it('defaults optional fields correctly', () => {
      const qr = QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL });
      expect(qr.quantity).toBe(0);
      expect(qr.status).toBe(QR_STATUS.ACTIVE);
      expect(qr.parentQrCode).toBeNull();
      expect(qr.splitFlag).toBe(0);
      expect(qr.splitIndex).toBe(0);
      expect(qr.batchNo).toBeNull();
    });
  });

  describe('reconstitute()', () => {
    it('restores from DB props without validation', () => {
      const qr = QRCode.reconstitute({
        id: 42,
        qrCode: 'QR-001',
        qrType: QR_TYPE.MATERIAL,
        quantity: 100,
        status: QR_STATUS.USED,
        parentQrCode: 'PARENT-001',
        splitFlag: 1,
        splitIndex: 3,
      });
      expect(qr.id).toBe(42);
      expect(qr.qrCode).toBe('QR-001');
      expect(qr.quantity).toBe(100);
      expect(qr.status).toBe(QR_STATUS.USED);
      expect(qr.parentQrCode).toBe('PARENT-001');
      expect(qr.splitFlag).toBe(1);
      expect(qr.splitIndex).toBe(3);
    });
  });

  describe('split()', () => {
    it('creates valid child QRCode', () => {
      const parent = QRCode.create({
        qrCode: 'PARENT-001',
        qrType: QR_TYPE.MATERIAL,
        quantity: 100,
        materialId: 1,
        materialName: 'Test',
        batchNo: 'B001',
      });
      const child = parent.split(30, 3, 1);
      expect(child.qrCode).toBe('PARENT-001-S1');
      expect(child.qrType).toBe(QR_TYPE.SPLIT);
      expect(child.parentQrCode).toBe('PARENT-001');
      expect(child.splitFlag).toBe(1);
      expect(child.splitIndex).toBe(1);
      expect(child.quantity).toBe(30);
      expect(child.materialId).toBe(1);
      expect(child.materialName).toBe('Test');
      expect(child.batchNo).toBe('B001');
    });

    it('throws if quantity <= 0', () => {
      const parent = QRCode.create({ qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      expect(() => parent.split(0, 2, 1)).toThrow(DomainError);
      expect(() => parent.split(-1, 2, 1)).toThrow(DomainError);
    });

    it('throws if quantity exceeds parent quantity', () => {
      const parent = QRCode.create({ qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 50 });
      expect(() => parent.split(100, 2, 1)).toThrow(DomainError);
    });

    it('throws if index <= 0', () => {
      const parent = QRCode.create({ qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      expect(() => parent.split(10, 2, 0)).toThrow(DomainError);
    });

    it('throws if index > totalSplits', () => {
      const parent = QRCode.create({ qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      expect(() => parent.split(10, 2, 3)).toThrow(DomainError);
    });

    it('allows exact quantity split', () => {
      const parent = QRCode.create({ qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      const child = parent.split(100, 1, 1);
      expect(child.quantity).toBe(100);
    });
  });

  describe('reduceQuantity()', () => {
    it('reduces quantity correctly', () => {
      const qr = QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      qr.reduceQuantity(30);
      expect(qr.quantity).toBe(70);
    });

    it('throws if amount is negative', () => {
      const qr = QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL, quantity: 100 });
      expect(() => qr.reduceQuantity(-1)).toThrow(DomainError);
    });

    it('throws if amount exceeds current quantity', () => {
      const qr = QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL, quantity: 50 });
      expect(() => qr.reduceQuantity(100)).toThrow(DomainError);
    });

    it('allows reducing to zero', () => {
      const qr = QRCode.create({ qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL, quantity: 50 });
      qr.reduceQuantity(50);
      expect(qr.quantity).toBe(0);
    });
  });
});
