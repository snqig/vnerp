'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Download, Package, Warehouse, Calendar } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { QrScanner } from '@/components/common/QrScanner';
import { TraceTimeline } from '@/components/trace/TraceTimeline';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import type { TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';

export default function TraceQueryPage() {
  const t = useTranslations('trace');
  const [loading, setLoading] = useState(false);
  const [qrContent, setQrContent] = useState('');
  const [timeline, setTimeline] = useState<TraceTimelineItem[]>([]);
  const [searched, setSearched] = useState(false);

  const handleScan = useCallback(async (content: string) => {
    setQrContent(content);
    setLoading(true);
    setSearched(true);
    try {
      const res = await authFetch(`/api/trace/qr/${encodeURIComponent(content)}`);
      const result = await res.json();
      if (result.success) {
        setTimeline(result.data?.timeline || []);
      } else {
        toast.error(result.message || t('scan.query_failed'));
        setTimeline([]);
      }
    } catch {
      toast.error(t('scan.query_failed'));
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const traceStats = (() => {
    const matTypes = new Set(timeline.map((i) => i.materialName).filter(Boolean)).size;
    const whCount = new Set(timeline.map((i) => i.eventName).filter(Boolean)).size;
    const times = timeline.map((i) => new Date(i.time).getTime()).filter(Boolean);
    const spanDays =
      times.length >= 2
        ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 86400000))
        : 0;
    return [
      { key: 'total', count: timeline.length },
      { key: 'materials', count: matTypes },
      { key: 'warehouses', count: whCount },
      { key: 'span', count: spanDays },
    ];
  })();

  const handleExportPdf = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const el = document.getElementById('trace-timeline-content');
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`trace-${qrContent || 'report'}.pdf`);
    toast.success(t('scan.export_success'));
  }, [qrContent, t]);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: t('scan.totalRecords'), icon: Search, ...StatsTheme.blue },
            { key: 'materials', label: t('scan.materialTypes'), icon: Package, ...StatsTheme.green },
            { key: 'warehouses', label: t('scan.warehouseCount'), icon: Warehouse, ...StatsTheme.orange },
            { key: 'span', label: t('scan.timeSpan'), icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={traceStats}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6" />
            {t('scan.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('scan.subtitle')}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <QrScanner
              onScan={handleScan}
              onError={(err) => toast.error(err)}
            />
          </CardContent>
        </Card>

        {searched && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('timeline.title')}</CardTitle>
                {timeline.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleExportPdf}>
                    <Download className="h-4 w-4 mr-1" />
                    {t('scan.export_pdf')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent id="trace-timeline-content">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">{t('scan.loading')}</div>
              ) : (
                <TraceTimeline items={timeline} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
