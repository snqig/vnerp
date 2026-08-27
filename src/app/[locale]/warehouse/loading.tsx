import { getTranslations } from 'next-intl/server';
import { Loader2 } from 'lucide-react';

export default async function WarehouseLoading() {
  const tc = await getTranslations('Common');
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1677ff' }} />
        <p className="text-sm" style={{ color: '#86909c' }}>
          {tc('loading')}
        </p>
      </div>
    </div>
  );
}
