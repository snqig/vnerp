'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    } catch (error) {
      console.error('Failed to fetch QR code info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制到剪贴板' });
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
        查看
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>二维码详情</DialogTitle>
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
                    <TabsTrigger value="info">基本信息</TabsTrigger>
                    <TabsTrigger value="extend">扩展信息</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-3 mt-4">
                    {record ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">类型：</span>
                            <Badge variant="outline">
                              {QRCodeTypeLabels[record.qr_type] || record.qr_type}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">状态：</span>
                            <Badge variant={QRCodeStatusLabels[record.status]?.variant}>
                              {QRCodeStatusLabels[record.status]?.label || '未知'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">关联单号：</span>
                            <span className="font-mono">{record.ref_no || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">批次号：</span>
                            <span>{record.batch_no || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">物料名称：</span>
                            <span>{record.material_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">规格：</span>
                            <span>{record.specification || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">数量：</span>
                            <span>
                              {record.quantity} {record.unit || ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">仓库：</span>
                            <span>{record.warehouse_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">供应商：</span>
                            <span>{record.supplier_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">客户：</span>
                            <span>{record.customer_name || '-'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">暂无详细信息</div>
                    )}
                  </TabsContent>

                  <TabsContent value="extend" className="space-y-3 mt-4">
                    {record ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">工单编号：</span>
                          <span>{record.work_order_no || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">生产日期：</span>
                          <span>{record.production_date?.slice(0, 10) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">有效期：</span>
                          <span>{record.expiry_date?.slice(0, 10) || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">打印次数：</span>
                          <span>{record.print_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">扫描次数：</span>
                          <span>{record.scan_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间：</span>
                          <span>{record.create_time?.slice(0, 19).replace('T', ' ') || '-'}</span>
                        </div>
                        {record.remark && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">备注：</span>
                            <span>{record.remark}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">暂无扩展信息</div>
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
                追溯
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
