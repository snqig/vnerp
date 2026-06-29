import { Loader2 } from 'lucide-react';

export default function WarehouseLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1677ff' }} />
        <p className="text-sm" style={{ color: '#86909c' }}>加载中...</p>
      </div>
    </div>
  );
}