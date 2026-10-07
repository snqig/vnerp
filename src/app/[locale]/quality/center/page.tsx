'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout';
import { QualityProcessPage } from '@/components/quality/QualityProcessPage';
import { QualityFinalPage } from '@/components/quality/QualityFinalPage';

type CenterTab = 'process' | 'final';

/**
 * 质量检验中心 —— 过程检 / 终检合一路由。
 *
 * 背景：此前 process（IPQC）与 final（FQC）是两个独立页面，列表列、统计卡、
 * 检验弹窗重复，切换需重新认列。现统一为质量检验中心，内 tab 切换
 * 「过程检验 / 成品终检」，共用同一套列表骨架、状态色板、批量操作底栏。
 *
 * 旧路由 /quality/process、/quality/final 保留为 307 重定向到本页，
 * 并按来源带上 ?tab=process / ?tab=final（见 next.config.ts redirects），
 * 否则侧边栏点「成品终检」会落到默认的过程检验 tab。
 *
 * tab 的读取放在 useEffect 而非 useSearchParams：既避免 Next 对
 * useSearchParams 的 Suspense/CSR bailout 要求，也避免 SSR 与客户端首帧
 * 不一致导致 hydration mismatch。
 */
export default function QualityCenterPage() {
  const t = useTranslations('Quality');
  const [activeTab, setActiveTab] = useState<CenterTab>('process');

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted === 'final' || wanted === 'process') {
      setActiveTab(wanted);
    }
  }, []);

  return (
    // 布局层由本页提供：两个子页面原本是独立路由，各自套 MainLayout；
    // 合并成tab 后必须由宿主统一提供，否则每个 tab 都会再套一层
    // Sidebar+Header（MainLayout 是 h-screen overflow-hidden 的完整壳），
    // 表现为两个侧边栏堆叠、勾选状态视觉上「合并选中」。
    <MainLayout title={t('qualityInspectionCenter')}>
      <div className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as CenterTab)}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="process">
              {t('processInspection')}
            </TabsTrigger>
            <TabsTrigger value="final">
              {t('finalInspection')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="space-y-6">
            <QualityProcessPage embedded />
          </TabsContent>
          <TabsContent value="final" className="space-y-6">
            <QualityFinalPage embedded />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}