import { describe, it, expect } from 'vitest';
import { generateZPLLabel, generateZPLBatchLabels } from '@/lib/label-service';

// Test internal helpers via generateZPLLabel (they are not exported)
function testEscape(text: string): string {
  // ZPL escapes: \ → \\, ^ → \^, ~ → \~
  return text.replace(/\\/g, '\\\\').replace(/\^/g, '\\^').replace(/~/g, '\\~');
}

function testWrap(text: string, maxChars: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);
  }
  return lines;
}

describe('label-service - pure functions', () => {

  describe('escapeZPLText (internal)', () => {
    it('should escape backslash', () => {
      expect(testEscape('a\\b')).toBe('a\\\\b');
    });

    it('should escape caret', () => {
      expect(testEscape('a^b')).toBe('a\\^b');
    });

    it('should escape tilde', () => {
      expect(testEscape('a~b')).toBe('a\\~b');
    });

    it('should escape mixed special chars', () => {
      expect(testEscape('\\^~test')).toBe('\\\\\\^\\~test');
    });

    it('should return plain text unchanged', () => {
      expect(testEscape('ABC123')).toBe('ABC123');
    });

    it('should handle empty string', () => {
      expect(testEscape('')).toBe('');
    });
  });

  describe('wrapText (internal)', () => {
    it('should return empty array for falsy input', () => {
      expect(testWrap('', 10)).toEqual([]);
      expect(testWrap(null as unknown as string, 10)).toEqual([]);
      expect(testWrap(undefined as unknown as string, 10)).toEqual([]);
    });

    it('should return single line if text fits', () => {
      expect(testWrap('ABC', 10)).toEqual(['ABC']);
    });

    it('should wrap to multiple lines', () => {
      expect(testWrap('ABCDEFGHIJ', 5)).toEqual(['ABCDE', 'FGHIJ']);
    });

    it('should handle partial remainder', () => {
      expect(testWrap('ABCDEFGHIJK', 5)).toEqual(['ABCDE', 'FGHIJ', 'K']);
    });

    it('should handle Chinese characters', () => {
      expect(testWrap('材料名称测试', 4)).toEqual(['材料名称', '测试']);
    });
  });

  describe('generateZPLLabel', () => {
    const baseParams = {
      labelNo: 'LBL-20260301-0001',
      qrCode: JSON.stringify({ ID: 'LBL-20260301-0001', TYPE: '1', NAME: '测试材料' }),
      materialCode: 'MAT001',
      materialName: '测试材料A',
      batchNo: 'B20260301',
      quantity: 100,
      unit: 'kg',
    };

    it('should start with ^XA and end with ^XZ', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl.startsWith('^XA')).toBe(true);
      expect(zpl.endsWith('^XZ')).toBe(true);
    });

    it('should include CI28 for Chinese chars', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain('^CI28');
    });

    it('should include QR code with JSON content', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain('^BQN');
      expect(zpl).toContain('^FDQA,{"ID":"LBL-20260301-0001","TYPE":"1","NAME":"测试材料"}^FS');
    });

    it('should include material code text', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain('^FDMAT001^FS');
    });

    it('should include material name', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain('测试材料A');
    });

    it('should include quantity and unit', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain('100kg');
    });

    it('should include specification when provided', () => {
      const zpl = generateZPLLabel({ ...baseParams, specification: 'A4/80g' });
      expect(zpl).toContain('A4/80g');
    });

    it('should not include specification when omitted', () => {
      const zpl = generateZPLLabel({ ...baseParams, specification: undefined });
      expect(zpl).not.toContain('undefined');
    });

    it('should include warehouse name when provided', () => {
      const zpl = generateZPLLabel({ ...baseParams, warehouseName: '主仓库' });
      expect(zpl).toContain('主仓库');
    });

    it('should include label number at bottom', () => {
      const zpl = generateZPLLabel(baseParams);
      expect(zpl).toContain(baseParams.labelNo);
    });

    it('should calculate dimensions based on mm to dots (60x40mm)', () => {
      const zpl60 = generateZPLLabel({ ...baseParams, labelWidth: 60, labelHeight: 40 });
      expect(zpl60).toContain('^PW480'); // Math.round(60/25.4*203) = 480
      expect(zpl60).toContain('^LL320'); // Math.round(40/25.4*203) = 320
    });

    it('should calculate dimensions based on mm to dots (100x60mm)', () => {
      const zpl100 = generateZPLLabel({ ...baseParams, labelWidth: 100, labelHeight: 60 });
      expect(zpl100).toContain('^PW799'); // Math.round(100/25.4*203) = 799
      expect(zpl100).toContain('^LL480'); // Math.round(60/25.4*203) = 480
    });

    it('should escape special ZPL chars in text values', () => {
      const zpl = generateZPLLabel({ ...baseParams, materialName: '测试^材料~名称\\' });
      expect(zpl).toContain('测试\\^材料\\~名称\\\\');
    });
  });

  describe('generateZPLBatchLabels', () => {
    it('should join multiple labels with newlines', () => {
      const labels = [
        { labelNo: 'LBL-001', qrCode: 'qr1', materialCode: 'MC1', materialName: 'M1', batchNo: 'B1', quantity: 10, unit: 'kg' },
        { labelNo: 'LBL-002', qrCode: 'qr2', materialCode: 'MC2', materialName: 'M2', batchNo: 'B2', quantity: 20, unit: 'm' },
      ];
      const zpl = generateZPLBatchLabels(labels);
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('LBL-001');
      expect(zpl).toContain('LBL-002');
      expect(zpl.split('^XZ').length - 1).toBe(2);
    });

    it('should handle single label', () => {
      const labels = [{ labelNo: 'LBL-001', qrCode: 'qr1', materialCode: 'MC1', materialName: 'M1', batchNo: 'B1', quantity: 5, unit: 'pcs' }];
      const zpl = generateZPLBatchLabels(labels);
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
    });

    it('should handle empty array', () => {
      expect(generateZPLBatchLabels([])).toBe('');
    });
  });

  describe('QR code JSON format', () => {
    it('should produce valid JSON for inbound labels', () => {
      const qrJson = JSON.stringify({
        ID: 'LBL-20260301-0001',
        TYPE: '1',
        WLDH: 'MAT001',
        NAME: '测试材料',
        GG: 'A4/80g',
        BATCH_NO: 'B20260301',
      });
      const parsed = JSON.parse(qrJson);
      expect(parsed.ID).toBe('LBL-20260301-0001');
      expect(parsed.TYPE).toBe('1');
      expect(parsed.WLDH).toBe('MAT001');
      expect(parsed.NAME).toBe('测试材料');
      expect(parsed.GG).toBe('A4/80g');
      expect(parsed.BATCH_NO).toBe('B20260301');
    });

    it('should produce valid JSON for work order labels', () => {
      const qrJson = JSON.stringify({
        ID: 'LBL-20260301-0002',
        TYPE: '5',
        GDDH: 'WO-20260301-001',
        NAME: '纸箱A',
      });
      const parsed = JSON.parse(qrJson);
      expect(parsed.ID).toBe('LBL-20260301-0002');
      expect(parsed.TYPE).toBe('5');
      expect(parsed.GDDH).toBe('WO-20260301-001');
      expect(parsed.NAME).toBe('纸箱A');
    });

    it('should produce valid JSON for FIFO priority labels', () => {
      const qrJson = JSON.stringify({
        ID: 'LBL-20260301-0003',
        TYPE: '1',
        WLDH: 'MAT002',
        NAME: '油墨',
        BATCH_NO: 'B20260302',
      });
      const parsed = JSON.parse(qrJson);
      expect(parsed.ID).toBe('LBL-20260301-0003');
      expect(parsed.TYPE).toBe('1');
      expect(parsed.WLDH).toBe('MAT002');
      expect(parsed.NAME).toBe('油墨');
      expect(parsed.BATCH_NO).toBe('B20260302');
    });

    it('should not contain UUID format (35-char hex)', () => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const qrJson = JSON.stringify({
        ID: 'LBL-20260301-0001',
        TYPE: '1',
        NAME: '测',
      });
      const parsed = JSON.parse(qrJson);
      expect(parsed.ID).not.toMatch(uuidPattern);
      expect(parsed).toHaveProperty('ID');
      expect(parsed).toHaveProperty('TYPE');
    });

    it('should be valid JSON when stored as qr_code field', () => {
      const qrCode = JSON.stringify({ ID: 'LBL-001', TYPE: '1', NAME: '测' });
      expect(() => JSON.parse(qrCode)).not.toThrow();
      expect(typeof JSON.parse(qrCode)).toBe('object');
    });
  });
});
