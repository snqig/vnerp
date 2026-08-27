'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { TraceTimeline } from '@/components/trace/TraceTimeline';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import type { TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';

export default function TraceContentPage() {
  const params = useParams();
  const content = params?.content as string;
  const t = useTranslations('trace');
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TraceTimelineItem[]>([]);

  useEffect(() => {
    if (!content) return;
    (async () => {
      try {
        const res = await authFetch(`/api/trace/qr/${encodeURIComponent(content)}`);
        const result = await res.json();
        if (result.success) {
          setTimeline(result.data?.timeline || []);
        } else {
          toast.error(result.message || t('scan.query_failed'));
        }
      } catch {
        toast.error(t('scan.query_failed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [content, t]);

  const handleExportPdf = async () => {
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
    pdf.save(`trace-${content || 'report'}.pdf`);
    toast.success(t('scan.export_success'));
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/warehouse/trace" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ArrowLeft className="w-4 h-4" />
              {t('scan.back_to_query')}
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t('timeline.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{content}</p>
          </div>
          {timeline.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1" />
              {t('scan.export_pdf')}
            </Button>
          )}
        </div>

        <Card>
          <CardContent id="trace-timeline-content" className="pt-6">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">{t('scan.loading')}</div>
            ) : (
              <TraceTimeline items={timeline} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
