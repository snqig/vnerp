'use client';
import { useTranslations } from 'next-intl';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, Download, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeTypeLabels, QRCodeStatusLabels } from './qr-code-types';
import type { QRCodeRecord } from './qr-code-types';
import { formatDate } from '@/lib/date-utils';

interface QRCodeViewerProps {
  qrCode: string;
  showDialog?: boolean;
  onDialogChange?: (open: boolean) => void;
  onTrace?: (qrCode: string) => void;
}

export function QRCodeViewer({
  qrCode,
  showDialog: externalShowDialog,
  onDialogChange,
  onTrace,
}: QRCodeViewerProps) {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  const { toast } = useToast();
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [record, setRecord] = useState<QRCodeRecord | null>(null);

  const showDialog = externalShowDialog ?? internalShowDialog;
  const setShowDialog = (open: boolean) => {
    if (onDialogChange) {
      onDialogChange(open);
    } else {
      setInternalShowDialog(open);
    }
    if (open && qrCode) {
      fetchQRCodeInfo();
    }
  };

  const fetchQRCodeInfo = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ qr_code: qrCode });
      const res = await fetch('/api/qrcode/trace?' + params);
      const result = await res.json();

      if (result.success && result.data?.record) {
        setRecord(result.data.record);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: ts('k_1r3wdvp') });
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const svg = document.querySelector(
      `#qrcode-${qrCode.replace(/[^a-zA-Z0-9]/g, '')} svg`
    ) as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${qrCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <Eye className="h-4 w-4 mr-1" />
        {ts('k_10fbkvl')}</Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ts('k_pu9cbd')}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* 二维码展示 */}
              <div className="col-span-1 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div id={`qrcode-${qrCode.replace(/[^a-zA-Z0-9]/g, '')}`}>
                    <QRCodeSVG value={qrCode} size={160} level="H" includeMargin />
                  </div>
                </div>
                <p className="mt-3 font-mono text-sm font-medium break-all text-center">{qrCode}</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleCopy(qrCode)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 信息展示 */}
              <div className="col-span-2">
                <Tabs defaultValue="info">
                  <TabsList className="w-full">
                    <TabsTrigger value="info">{ts('k_z5lkkb')}</TabsTrigger>
                    <TabsTrigger value="extend">{ts('k_132n2j')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-3 mt-4">
                    {record ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{ts('k_1k0pyqj')}</span>
                            <Badge variant="outline">
                              {QRCodeTypeLabels[record.qr_type] || record.qr_type}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1pwh7dy')}</span>
                            <Badge variant={QRCodeStatusLabels[record.status]?.variant}>
                              {QRCodeStatusLabels[record.status]?.label || ts('k_1lpnuh4')}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1maaz4k')}</span>
                            <span className="font-mono">{record.ref_no || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_ooweuu')}</span>
                            <span>{record.batch_no || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_8mdfm8')}</span>
                            <span>{record.material_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1gnvyud')}</span>
                            <span>{record.specification || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1b3179q')}</span>
                            <span>
                              {record.quantity} {record.unit || ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1gt4rsr')}</span>
                            <span>{record.warehouse_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{ts('k_1lrnm7u')}</span>
                            <span>{record.supplier_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{tc('customerLabel')}</span>
                            <span>{record.customer_name || '-'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">{ts('k_51tctj')}</div>
                    )}
                  </TabsContent>

                  <TabsContent value="extend" className="space-y-3 mt-4">
                    {record ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{ts('k_11v3fq2')}</span>
                          <span>{record.work_order_no || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{ts('k_1jk755b')}</span>
                          <span>{formatDate(record.production_date) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{ts('k_dbt4ox')}</span>
                          <span>{formatDate(record.expiry_date) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{ts('k_ln1jpb')}</span>
                          <span>{record.print_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{ts('k_6fgodo')}</span>
                          <span>{record.scan_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{ts('k_1rmmf2g')}</span>
                          <span>{record.create_time?.slice(0, 19).replace('T', ' ') || '-'}</span>
                        </div>
                        {record.remark && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">{ts('k_1ohyab4')}</span>
                            <span>{record.remark}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">{ts('k_143wrd5')}</div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          <DialogFooter>
            {onTrace && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  onTrace(qrCode);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {ts('k_bb05tx')}</Button>
            )}
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {ts('k_g0fanx')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
