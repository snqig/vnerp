'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';

interface TraceTimelineProps {
  items: TraceTimelineItem[];
}

const eventColors: Record<string, string> = {
  inbound: 'bg-blue-100 text-blue-800',
  split: 'bg-purple-100 text-purple-800',
  finished: 'bg-green-100 text-green-800',
  outbound: 'bg-orange-100 text-orange-800',
  scan: 'bg-gray-100 text-gray-800',
};

export function TraceTimeline({ items }: TraceTimelineProps) {
  const t = useTranslations('trace');

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('timeline.no_data')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
      {items.map((item, index) => (
        <div key={index} className="relative">
          <div className="absolute -left-4 mt-1.5 size-3 rounded-full border-2 border-primary bg-background" />
          <Card className="ml-2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={eventColors[item.eventType] || ''}>
                  {item.eventName || item.eventType}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {item.docNo && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.doc_no')}:</span> {item.docNo}
                  </div>
                )}
                {item.operator && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.operator')}:</span> {item.operator}
                  </div>
                )}
                {item.materialName && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.material')}:</span> {item.materialName}
                  </div>
                )}
                {item.batchNo && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.batch')}:</span> {item.batchNo}
                  </div>
                )}
                {item.quantity && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.quantity')}:</span> {item.quantity}
                  </div>
                )}
                {item.process && (
                  <div>
                    <span className="text-muted-foreground">{t('timeline.process')}:</span> {item.process}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
