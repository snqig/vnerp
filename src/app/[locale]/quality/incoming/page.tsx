'use client';

import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { QualityIncomingPage } from '@/components/quality/QualityIncomingPage';

/**
 * 来料检验 —— 独立路由壳。
 *
 * 本体已并入质量检验中心 /quality/center 的「来料检验」tab（见 center/page.tsx），
 * 与过程检验、成品终检共用同一套路由；本路由保留仅为兼容旧链接与书签，
 * 因此复用同一组件并自行提供布局层。
 */
export default function IncomingInspectionRoute() {
  const t = useTranslations('Quality');
  return (
    <MainLayout title={t('incomingInspection')}>
      <QualityIncomingPage />
    </MainLayout>
  );
}