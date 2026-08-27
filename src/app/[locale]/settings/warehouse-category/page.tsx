'use client';

import { MainLayout } from '@/components/layout';
import { WarehouseCategoryManager } from './warehouse-category-manager';

export default function WarehouseCategoryPage() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <WarehouseCategoryManager />
      </div>
    </MainLayout>
  );
}
