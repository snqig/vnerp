'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

interface QrScannerProps {
  onScan: (result: string) => void;
  onError?: (err: string) => void;
  placeholder?: string;
}

export function QrScanner({ onScan, onError, placeholder }: QrScannerProps) {
  const t = useTranslations('trace');
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleManualSubmit = useCallback(() => {
    const value = manualInput.trim();
    if (!value) {
      onError?.(t('scan.input_empty'));
      return;
    }
    onScan(value);
    setManualInput('');
  }, [manualInput, onScan, onError, t]);

  const handleCameraScan = useCallback(async () => {
    try {
      setScanning(true);
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, 'qr-scanner-preview');
      if (result?.getText()) {
        onScan(result.getText());
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('scan.camera_error'));
    } finally {
      setScanning(false);
    }
  }, [onScan, onError, t]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={placeholder || t('scan.input_placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
        />
        <Button onClick={handleManualSubmit} variant="default">
          {t('scan.query')}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleCameraScan} disabled={scanning} variant="outline">
          {scanning ? t('scan.scanning') : t('scan.scan_button')}
        </Button>
      </div>
      <video id="qr-scanner-preview" className="hidden" />
    </div>
  );
}
