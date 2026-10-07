'use client';
import { useTranslations } from 'next-intl';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScanLine,
  Camera,
  Keyboard,
  X,
  CheckCircle2,
  AlertCircle,
  History,
  Loader2,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useOfflineScanSync } from '@/hooks/use-network-status';

type ScanMode = 'inbound' | 'outbound' | 'feed' | 'query' | 'verify';

interface ScanHistoryItem {
  qrCode: string;
  time: string;
  success: boolean;
  message?: string;
}

interface QRCodeScannerProps {
  placeholder?: string;
  onScan: (qrCode: string) => Promise<void> | void;
  validate?: (qrCode: string) => Promise<boolean | { valid: boolean; message?: string }>;
  scanMode?: ScanMode;
  autoFocus?: boolean;
  showHistory?: boolean;
  showCamera?: boolean;
  inputOnly?: boolean;
  disabled?: boolean;
  className?: string;
  /** 离线优先：断网时扫码暂存 IndexedDB，联网自动补传（默认关闭，避免影响既有调用方） */
  offlineSupport?: boolean;
}

export function QRCodeScanner({
  placeholder,
  onScan,
  validate,
  scanMode = 'query',
  autoFocus = false,
  showHistory = true,
  showCamera = true,
  inputOnly = false,
  disabled = false,
  className = '',
  offlineSupport = false,
}: QRCodeScannerProps) {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  const tp = useTranslations('PadScan');
  const resolvedPlaceholder = placeholder ?? ts('k_1v6ose0');
  const { toast } = useToast();
  const locale = useLocale();

  // 离线优先：接入孤儿化的 offline-scan-queue + useOfflineScanSync。
  // 断网时 processScan 直接落 IndexedDB；联网后 syncPending 通过 onScan 重放，使扫码结果在恢复网络后自动补齐。
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const { isOnline, syncing, pendingCount, syncPending, refreshCount } = useOfflineScanSync(
    useCallback(
      async (items: Array<{ qrCode: string; scanType: string; payload: Record<string, unknown> }>) => {
        for (const item of items) {
          await onScanRef.current(item.qrCode);
        }
      },
      []
    )
  );

  useEffect(() => {
    if (isOnline) {
      void syncPending();
    }
  }, [isOnline, syncPending]);
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [lastResult, setLastResult] = useState<{ success: boolean; message?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const processScan = async (qrCode: string) => {
    if (!qrCode || qrCode.trim() === '') return;

    const trimmedCode = qrCode.trim();
    setIsProcessing(true);
    setLastResult(null);

    try {
      // 验证二维码
      if (validate) {
        const validationResult = await validate(trimmedCode);
        const isValid =
          typeof validationResult === 'boolean' ? validationResult : validationResult.valid;
        const message = typeof validationResult === 'object' ? validationResult.message : undefined;

        if (!isValid) {
          setLastResult({ success: false, message: message || ts('k_1auwe14') });
          setHistory((prev) => [
            {
              qrCode: trimmedCode,
              time: new Date().toISOString(),
              success: false,
              message: message || ts('k_1auwe14'),
            },
            ...prev.slice(0, 19),
          ]);
          toast({
            title: ts('k_1auwe14'),
            description: message || ts('k_vf58rh'),
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      // 离线优先：断网时直接暂存本地队列，联网后自动补传
      if (offlineSupport && !isOnline) {
        try {
          const { enqueueScan } = await import('@/lib/offline-scan-queue');
          await enqueueScan({
            qrCode: trimmedCode,
            scanType: scanMode,
            payload: { scanMode },
            maxAttempts: 3,
          });
          void refreshCount();
          setLastResult({ success: true, message: tp('offlineQueued') });
          setHistory((prev) => [
            {
              qrCode: trimmedCode,
              time: new Date().toISOString(),
              success: true,
              message: tp('offlineQueued'),
            },
            ...prev.slice(0, 19),
          ]);
          toast({ title: tp('offlineQueued') });
          setInputValue('');
          setIsProcessing(false);
          return;
        } catch (e) {
          console.error('[QRCodeScanner] 离线暂存失败', e);
          // 暂存失败则继续走在线逻辑，交由下方错误处理
        }
      }

      // 在线：执行扫描回调
      await onScan(trimmedCode);

      setLastResult({ success: true });
      setHistory((prev) => [
        {
          qrCode: trimmedCode,
          time: new Date().toISOString(),
          success: true,
        },
        ...prev.slice(0, 19),
      ]);

      toast({ title: ts('k_mxo5dy'), description: trimmedCode });

      // 清空输入
      setInputValue('');
    } catch (error) {
      setLastResult({ success: false, message: (error as Error).message || ts('k_8uoust') });
      setHistory((prev) => [
        {
          qrCode: trimmedCode,
          time: new Date().toISOString(),
          success: false,
          message: (error as Error).message || ts('k_8uoust'),
        },
        ...prev.slice(0, 19),
      ]);
      toast({
        title: tc('scanFailed'),
        description: (error as Error).message || ts('k_e16dng'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 将最新 processScan 存入 ref，供摄像头回调在 effect 中稳定调用
  const processScanRef = useRef(processScan);
  processScanRef.current = processScan;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      processScan(inputValue);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  // 摄像头扫码：启用相机模式后调用，识别到二维码自动提交
  const startCamera = useCallback(async () => {
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current as HTMLVideoElement,
        (result) => {
          if (!result || !result.getText()) return;
          if (!cameraActiveRef.current) return;
          cameraActiveRef.current = false;
          scannerControlsRef.current?.stop();
          processScanRef.current(result.getText());
        }
      );
      scannerControlsRef.current = controls;
    } catch (err) {
      toast({
        title: ts('k_70cj65'),
        description: err instanceof Error ? err.message : ts('k_1ink02q'),
        variant: 'destructive',
      });
      setMode('manual');
    }
  }, [toast]);

  // 进入/退出相机模式时启停摄像头
  useEffect(() => {
    if (mode === 'camera') {
      cameraActiveRef.current = true;
      startCamera();
    }
    return () => {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      cameraActiveRef.current = false;
    };
  }, [mode, startCamera]);

  const getModeLabel = () => {
    switch (scanMode) {
      case 'inbound':
        return ts('k_lhzirh');
      case 'outbound':
        return ts('k_1vlzpeu');
      case 'feed':
        return ts('k_1jxw2b3');
      case 'query':
        return ts('k_11sdqre');
      case 'verify':
        return ts('k_9ks60i');
      default:
        return ts('k_16tvy7l');
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {getModeLabel()}
            {offlineSupport && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 gap-1 text-xs">
                {syncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <CloudOff className="h-3 w-3" />
                )}
                {syncing ? ts('syncing') : tp('pendingSync', { count: pendingCount })}
              </Badge>
            )}
          </CardTitle>
          {!inputOnly && showCamera && (
            <div className="flex gap-1">
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('manual')}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Button
                variant={mode === 'camera' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(mode === 'camera' ? 'manual' : 'camera')}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 摄像头预览 */}
        {mode === 'camera' && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              className="w-full rounded-lg border bg-black aspect-video object-cover"
              muted
              playsInline
            />
            <p className="text-xs text-muted-foreground">{ts('k_riml6r')}</p>
          </div>
        )}
        {/* 输入区域 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={resolvedPlaceholder}
              disabled={disabled || isProcessing}
              className="font-mono"
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setInputValue('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={() => processScan(inputValue)}
            disabled={disabled || isProcessing || !inputValue.trim()}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ScanLine className="h-4 w-4 mr-1" />
                {ts('k_kre8wf')}</>
            )}
          </Button>
        </div>

        {/* 扫描结果提示 */}
        {lastResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              lastResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {lastResult.success ? ts('k_die2kv') : lastResult.message}
            </span>
          </div>
        )}

        {/* 历史记录 */}
        {showHistory && history.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>
                  {ts('k_u3w4mj')}
                  {history.length})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                {tc('clear')}</Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    item.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                    )}
                    <span className="font-mono">{item.qrCode}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(item.time).toLocaleTimeString(locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
