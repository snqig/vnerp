'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WarehouseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f7fa' }}>
          <AlertCircle className="w-6 h-6" style={{ color: '#f5222d' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#1f2329' }}>页面加载失败</h2>
          <p className="text-sm" style={{ color: '#86909c' }}>{error.message || '请稍后重试'}</p>
        </div>
        <Button
          onClick={reset}
          className="gap-2"
          style={{ backgroundColor: '#1677ff', borderColor: '#1677ff' }}
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </Button>
      </div>
    </div>
  );
}