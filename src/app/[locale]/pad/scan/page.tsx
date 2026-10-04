'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { QRCodeScanner } from '@/components/qr-code';
import { authFetch } from '@/lib/auth-fetch';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatDate } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wifi,
  WifiOff,
  Tag,
  Package,
  Scissors,
  Layers,
  Clock,
  Link2,
  CircleDot,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

type TraceTimelineItem = {
  time: string;
  track: string;
  event: string;
  detail: string;
};

type TraceData = {
  source: string;
  label: Record<string, any> | null;
  qr: Record<string, any> | null;
  timeline: TraceTimelineItem[];
};

type Mode = 'trace' | 'stocktake';

export default function PadScanPage() {
  const t = useTranslations('PadScan');
  const { isOnline } = useNetworkStatus();
  const [mode, setMode] = useState<Mode>('trace');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">{t('title')}</h1>
          <p className="truncate text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Badge
          variant={isOnline ? 'default' : 'destructive'}
          className="shrink-0 gap-1 px-3 py-1 text-sm"
        >
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? t('online') : t('offline')}
        </Badge>
      </header>

      {/* 模式切换：触屏大按钮 */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <ModeButton active={mode === 'trace'} onClick={() => setMode('trace')} icon={<CircleDot className="h-4 w-4" />}>
          {useTranslations('QRCode')('trace')}
        </ModeButton>
        <ModeButton active={mode === 'stocktake'} onClick={() => setMode('stocktake')} icon={<ClipboardList className="h-4 w-4" />}>
          {t('modeStocktake')}
        </ModeButton>
      </div>

      <main className="flex-1 grid gap-4 p-4 lg:grid-cols-2">
        {mode === 'trace' ? <TraceMode /> : <StocktakeMode />}
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-muted/40 text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============================ 溯源 / trace-verify ============================ */

function TraceMode() {
  const t = useTranslations('PadScan');
  const tc = useTranslations('Common');
  const tqr = useTranslations('QRCode');
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceData | null>(null);

  const handleScan = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          '/api/qrcode/unified-trace?content=' + encodeURIComponent(code)
        );
        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data as TraceData);
        } else if (result.code === 404) {
          setData(null);
          setError(t('notFound'));
        } else {
          setData(null);
          setError(result.message || t('notFound'));
        }
      } catch (e) {
        setData(null);
        setError((e as Error).message || t('notFound'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const typeMap: Record<string, string> = {
    material: tqr('rawMaterial'),
    product: tqr('finished'),
    workorder: tqr('workOrder'),
    ink: tqr('ink'),
    screen_plate: tqr('screen'),
    die: tqr('blade'),
    shipment: tqr('shipment'),
    ink_open: tqr('inkOpen'),
    ink_mixed: tqr('inkMixed'),
  };
  const statusMap: Record<number, string> = {
    1: tqr('valid'),
    2: tqr('used'),
    3: tqr('expired'),
    9: tqr('void'),
  };

  return (
    <>
      <section className="flex flex-col">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CircleDot className="h-4 w-4" />
          {t('scanHint')}
        </div>
        <QRCodeScanner scanMode="query" autoFocus onScan={handleScan} placeholder={t('scanHint')} className="flex-1" />
      </section>

      <section className="flex flex-col">
        {loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">{tc('loading')}</CardContent>
          </Card>
        )}
        {!loading && error && (
          <Card>
            <CardContent className="p-8 text-center text-destructive">{error}</CardContent>
          </Card>
        )}
        {!loading && !error && !data && (
          <Card className="flex-1">
            <CardContent className="flex h-full min-h-[200px] items-center justify-center p-8 text-center text-muted-foreground">
              {t('traceTitle')}
            </CardContent>
          </Card>
        )}
        {!loading && data && <TraceResult data={data} typeMap={typeMap} statusMap={statusMap} />}
      </section>
    </>
  );
}

function TraceResult({
  data,
  typeMap,
  statusMap,
}: {
  data: TraceData;
  typeMap: Record<string, string>;
  statusMap: Record<number, string>;
}) {
  const t = useTranslations('PadScan');
  const tc = useTranslations('Common');
  const tqr = useTranslations('QRCode');
  const locale = useLocale();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('source')}:</span>
        <Badge variant="outline" className="gap-1">
          <Tag className="h-3.5 w-3.5" />
          {data.source === 'dcprint_label' ? t('sourceLabel') : t('sourceGeneric')}
        </Badge>
        {(data.label?.qr_record_id != null || data.qr?.label_id != null) && (
          <Badge variant="secondary" className="gap-1" title="双轨互链">
            <Link2 className="h-3.5 w-3.5" />
            已与另一轨互链
          </Badge>
        )}
      </div>

      {data.qr && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              {tqr('qrCode')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label={tqr('qrCode')} value={String(data.qr.qr_code)} mono />
            <Field label={tqr('typeMaterial')} value={typeMap[data.qr.qr_type] || data.qr.qr_type} />
            <Field label={tqr('materialName')} value={data.qr.material_name || '-'} />
            <Field label={tqr('batchNo')} value={data.qr.batch_no || '-'} />
            <Field label={tc('warehouse')} value={data.qr.warehouse_name || '-'} />
            <Field label={tc('quantity')} value={`${data.qr.quantity ?? ''}${data.qr.unit || ''}`} />
            <Field label={tc('status')} value={statusMap[Number(data.qr.status)] || '-'} />
            <Field label={tqr('productionDate')} value={formatDate(data.qr.production_date) || '-'} />
            <Field label={tqr('expiryDate')} value={formatDate(data.qr.expiry_date) || '-'} />
            {(data.qr.scanLogs?.length ?? 0) > 0 && (
              <SubList
                icon={<Clock className="h-4 w-4" />}
                title={t('scanLogs')}
                items={data.qr.scanLogs.map(
                  (s: Record<string, any>) =>
                    `${s.scan_type || 'trace'} · ${s.operator_name || '-'} · ${s.scan_message || s.scan_result || ''}`
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      {data.label && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              {t('sourceLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label={t('labelNo')} value={String(data.label.label_no)} mono />
            <Field label={tqr('materialName')} value={data.label.material_name || '-'} />
            <Field label={tqr('materialCode')} value={data.label.material_code || '-'} />
            <Field label={tqr('batchNo')} value={data.label.batch_no || '-'} />
            <Field
              label={t('remainingWidth')}
              value={
                data.label.remaining_width != null
                  ? `${data.label.remaining_width}${data.label.unit || 'mm'}`
                  : '-'
              }
            />
            <Field label={tc('quantity')} value={`${data.label.quantity ?? ''}${data.label.unit || ''}`} />
            {data.label.parent_label_no && (
              <Field label={t('parentLabel')} value={String(data.label.parent_label_no)} mono />
            )}
            {(data.label.cuttingRecords?.length ?? 0) > 0 && (
              <SubList
                icon={<Scissors className="h-4 w-4" />}
                title={t('cutting')}
                items={data.label.cuttingRecords.map(
                  (c: Record<string, any>) =>
                    `${c.recordNo || ''} · 切宽 ${c.cutWidth ?? '-'} · 余幅 ${c.remainWidth ?? '-'} · ${c.operatorName || '-'}`
                )}
              />
            )}
            {(data.label.childLabels?.length ?? 0) > 0 && (
              <SubList
                icon={<Layers className="h-4 w-4" />}
                title={t('childLabels')}
                items={data.label.childLabels.map(
                  (c: Record<string, any>) =>
                    `${c.labelNo} · ${c.width ?? '-'}${c.unit || 'mm'} · ${c.materialName || ''}`
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {tqr('traceTimeline')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.timeline?.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">{t('noTimeline')}</p>
          ) : (
            <ol className="space-y-3">
              {data.timeline.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        item.track === 'label' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />
                    {i < data.timeline.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.event}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.track === 'label' ? t('trackLabel') : t('trackQr')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{item.detail}</div>
                    <div className="text-xs text-muted-foreground/70">
                      {new Date(item.time).toLocaleString(locale)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================ 盘点 / stocktake（业务集成 Phase C） ============================ */

function StocktakeMode() {
  const t = useTranslations('PadScan');
  const tc = useTranslations('Common');

  const [orderId, setOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState<number | null>(null);
  const [scanned, setScanned] = useState<TraceData | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, any> | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const loadOrder = () => {
    const id = Number(orderId);
    if (!id || id <= 0) {
      setError(t('enterOrderId'));
      return;
    }
    setActiveOrder(id);
    setError(null);
    setScanned(null);
    setScannedCode('');
    setActualQty('');
    setLastResult(null);
    setProgress(null);
  };

  const handleScan = useCallback(
    async (code: string) => {
      setError(null);
      setScanned(null);
      setScannedCode(code);
      setActualQty('');
      setLastResult(null);
      try {
        const res = await authFetch('/api/qrcode/unified-trace?content=' + encodeURIComponent(code));
        const result = await res.json();
        if (result.success && result.data) {
          setScanned(result.data as TraceData);
        }
        // 即便溯源无结果也保留 scannedCode，便于直接录入（通用二维码轨）
      } catch {
        // 溯源失败不影响后续盘点录入
      }
    },
    []
  );

  const confirmStocktake = useCallback(async () => {
    if (activeOrder == null) {
      setError(t('noOrder'));
      return;
    }
    if (scannedCode.trim() === '') {
      setError(t('scanToStart'));
      return;
    }
    const qty = Number(actualQty);
    if (!Number.isFinite(qty) || qty < 0) {
      setError(tc('k_v8vb9i') || '实盘数量必须为不小于 0 的数字');
      return;
    }
    // 双轨解析：若扫码解析出通用二维码轨 qr_code，优先用其作为盘点录入码
    const postCode = scanned?.qr?.qr_code || scannedCode;
    setPosting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${activeOrder}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: postCode, actual_quantity: qty }),
      });
      const result = await res.json();
      if (result.success) {
        setLastResult(result.data);
        setProgress(result.data?.progress ?? null);
        setScanned(null);
        setScannedCode('');
        setActualQty('');
      } else {
        setError(result.message || t('stocktakeSaved'));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }, [activeOrder, scanned, scannedCode, actualQty, t, tc]);

  return (
    <>
      <section className="flex flex-col">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          {t('modeStocktake')}
        </div>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder={t('enterOrderId')}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="font-mono"
          />
          <Button onClick={loadOrder} disabled={!orderId.trim()}>
            {t('loadOrder')}
          </Button>
        </div>
        {activeOrder != null && (
          <p className="mt-2 text-sm text-muted-foreground">{t('orderLoaded', { id: activeOrder })}</p>
        )}
        <div className="mt-3">
          <QRCodeScanner
            scanMode="verify"
            autoFocus={activeOrder != null}
            onScan={handleScan}
            placeholder={t('scanToStart')}
            className="flex-1"
            disabled={activeOrder == null}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {error && (
          <Card>
            <CardContent className="p-4 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {activeOrder == null && !error && (
          <Card className="flex-1">
            <CardContent className="flex h-full min-h-[160px] items-center justify-center p-8 text-center text-muted-foreground">
              {t('noOrder')}
            </CardContent>
          </Card>
        )}

        {activeOrder != null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                {t('scannedMaterial')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanned ? (
                <>
                  <Field label={t('source')} value={scanned.source === 'dcprint_label' ? t('sourceLabel') : t('sourceGeneric')} />
                  <Field label={tc('materialName')} value={scanned.qr?.material_name || scanned.label?.material_name || '-'} />
                  <Field label={tc('batchNo')} value={scanned.qr?.batch_no || scanned.label?.batch_no || '-'} />
                  <Field label={tc('warehouse')} value={scanned.qr?.warehouse_name || '-'} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{scannedCode || t('scanToStart')}</p>
              )}
              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-muted-foreground">{t('actualQty')}</label>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={actualQty}
                    onChange={(e) => setActualQty(e.target.value)}
                    className="font-mono text-lg"
                  />
                </div>
                <Button
                  onClick={confirmStocktake}
                  disabled={posting || scannedCode.trim() === ''}
                  className="gap-1"
                >
                  {posting ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('confirmStocktake')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {lastResult && (
          <Card>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {t('stocktakeSaved')}
              </div>
              <Field label={tc('materialName')} value={lastResult.material_name || '-'} />
              <Field label={t('bookQty')} value={String(lastResult.book_quantity ?? '-')} />
              <Field label={t('actualQty')} value={String(lastResult.actual_quantity ?? '-')} />
              <Field label={t('diff')} value={String(lastResult.difference ?? '-')} />
              {progress != null && (
                <div className="pt-1">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{t('progress')}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

/* ============================ 共享小组件 ============================ */

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono text-xs break-all' : 'break-words'}`}>
        {value}
      </span>
    </div>
  );
}

function SubList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="pt-1">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-1 pl-1">
        {items.map((it, i) => (
          <li key={i} className="rounded bg-muted/50 px-2 py-1 text-xs text-foreground/80 break-words">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
