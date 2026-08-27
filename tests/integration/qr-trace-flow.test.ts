import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPool } from '@/lib/db';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCode } from '@/domain/trace/QRCode';

describe('QR Trace Full Chain Integration', () => {
  const repo = new MysqlQRCodeRepository();
  const testQrCode = `INT-TEST-${Date.now()}`;

  beforeEach(async () => {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.execute('DELETE FROM qrcode_record WHERE qr_code LIKE ?', ['INT-TEST-%']);
      await conn.execute('DELETE FROM qrcode_scan_log WHERE qr_code LIKE ?', ['INT-TEST-%']);
    } finally {
      conn.release();
    }
  });

  afterEach(async () => {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.execute('DELETE FROM qrcode_record WHERE qr_code LIKE ?', ['INT-TEST-%']);
      await conn.execute('DELETE FROM qrcode_scan_log WHERE qr_code LIKE ?', ['INT-TEST-%']);
    } finally {
      conn.release();
    }
  });

  it('full chain: create → find → split → find children → update quantity', async () => {
    const qr = QRCode.create({
      qrCode: testQrCode,
      qrType: 'material',
      batchNo: 'BATCH-INT-001',
      quantity: 100,
      materialId: 1,
      materialName: 'Integration Test Material',
    });

    const id = await repo.create(qr);
    expect(id).toBeGreaterThan(0);

    const found = await repo.findByContent(testQrCode);
    expect(found).not.toBeNull();
    expect(found!.qrCode).toBe(testQrCode);
    expect(found!.quantity).toBe(100);
    expect(found!.id).toBe(id);

    const child1 = qr.split(30, 3, 1);
    const child2 = qr.split(30, 3, 2);
    const child3 = qr.split(40, 3, 3);

    const childIds = await repo.createBatch([child1, child2, child3]);
    expect(childIds).toHaveLength(3);

    const children = await repo.findByParentQrCode(testQrCode);
    expect(children).toHaveLength(3);
    expect(children[0].splitIndex).toBe(1);
    expect(children[2].quantity).toBe(40);

    await repo.updateQuantity(id, 70);
    const updated = await repo.findByContent(testQrCode);
    expect(updated!.quantity).toBe(70);

    const batchCodes = await repo.findByBatchNo('BATCH-INT-001');
    expect(batchCodes.length).toBeGreaterThanOrEqual(1);
  });

  it('query trace timeline returns structured data', async () => {
    const qr = QRCode.create({
      qrCode: `${testQrCode}-TIMELINE`,
      qrType: 'material',
      batchNo: 'BATCH-TL-001',
      quantity: 50,
      materialId: 2,
      materialName: 'Timeline Test',
    });
    const id = await repo.create(qr);
    expect(id).toBeGreaterThan(0);

    await repo.updateQuantity(id, 40);

    const timeline = await repo.queryTraceTimeline(qr.qrCode);
    expect(Array.isArray(timeline)).toBe(true);
  });

  it('findByContent returns null for non-existent QR', async () => {
    const result = await repo.findByContent('NONEXISTENT-QR-CODE');
    expect(result).toBeNull();
  });
});
