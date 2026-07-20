'use client';

import { MainLayout } from '@/components/layout';
import { OrganizationTree } from '@/components/hr/OrganizationTree';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OrganizationPage() {
  const t = useTranslations('Common');
  const th = useTranslations('Hr');

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">{th('organization')}</h1>
        </div>
        <OrganizationTree />
      </div>
    </MainLayout>
  );
}
