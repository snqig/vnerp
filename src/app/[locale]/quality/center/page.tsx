'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QualityProcessPage } from '@/components/quality/QualityProcessPage';
import { QualityFinalPage } from '@/components/quality/QualityFinalPage';

/**
 * 质量检验中心 —— 过程检 / 终检合一路由。
 *
 * 背景：此前 process（IPQC）与 final（FQC）是两个独立页面，列表列、统计卡、
 * 检验弹窗重复，切换需重新认列。现统一为质量检验中心，内 tab 切换
 * 「过程检验 / 成品终检」，共用同一套列表骨架、状态色板、批量操作底栏。
 *
 * 旧路由 /quality/process、/quality/final 保留为 301 重定向（见 next.config.ts），
 * 便于书签与外部引用不中断。
 */
export default function QualityCenterPage() {
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');
  const [activeTab, setActiveTab] = useState<'process' | 'final'>('process');

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'process' | 'final')}
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
          <QualityProcessPage />
        </TabsContent>
        <TabsContent value="final" className="space-y-6">
          <QualityFinalPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}