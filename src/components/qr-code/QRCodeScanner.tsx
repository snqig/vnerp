'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ScanLine,
  Camera,
  Keyboard,
  X,
  CheckCircle2,
  AlertCircle,
  History,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';

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
}

export function QRCodeScanner({
  placeholder = '扫描或输入二维码...',
  onScan,
  validate,
  scanMode = 'query',
  autoFocus = true,
  showHistory = true,
  showCamera = true,
  inputOnly = false,
  disabled = false,
  className = '',
}: QRCodeScannerProps) {
  const { toast } = useToast();
  const locale = useLocale();
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [lastResult, setLastResult] = useState<{ success: boolean; message?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          setLastResult({ success: false, message: message || '验证失败' });
          setHistory((prev) => [
            {
              qrCode: trimmedCode,
              time: new Date().toISOString(),
              success: false,
              message: message || '验证失败',
            },
            ...prev.slice(0, 19),
          ]);
          toast({
            title: '验证失败',
            description: message || '二维码验证不通过',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      // 执行扫描回调
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

      toast({ title: '扫描成功', description: trimmedCode });

      // 清空输入
      setInputValue('');
    } catch (error: any) {
      setLastResult({ success: false, message: error.message || '处理失败' });
      setHistory((prev) => [
        {
          qrCode: trimmedCode,
          time: new Date().toISOString(),
          success: false,
          message: error.message || '处理失败',
        },
        ...prev.slice(0, 19),
      ]);
      toast({
        title: '扫描失败',
        description: error.message || '请重试',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      processScan(inputValue);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const getModeLabel = () => {
    switch (scanMode) {
      case 'inbound':
        return '扫码入库';
      case 'outbound':
        return '扫码出库';
      case 'feed':
        return '扫码投料';
      case 'query':
        return '扫码查询';
      case 'verify':
        return '扫码验证';
      default:
        return '扫码';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {getModeLabel()}
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
                onClick={() => setMode('camera')}
                disabled
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 输入区域 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
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
                确认
              </>
            )}
          </Button>
        </div>

        {/* 扫描结果提示 */}
        {lastResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              lastResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {lastResult.success ? '验证成功' : lastResult.message}
            </span>
          </div>
        )}

        {/* 历史记录 */}
        {showHistory && history.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>最近扫描 ({history.length})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                清空
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    item.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500" />
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
