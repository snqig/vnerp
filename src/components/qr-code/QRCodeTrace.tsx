'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Package,
  ArrowRight,
  Truck,
  Factory,
  ClipboardList,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  ChevronRight,
  Box,
  Layers,
  ScanLine,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeTypeLabels, QRCodeStatusLabels } from './qr-code-types';
import type { TraceData, TraceEvent } from './qr-code-types';

interface QRCodeTraceProps {
  qrCode?: string;
  showDialog?: boolean;
  onDialogChange?: (open: boolean) => void;
  initialQRCode?: string;
}

const eventIcons: Record<string, any> = {
  原材料入库: Package,
  小料拆分: Layers,
  生产领料: Box,
  投料: ScanLine,
  生产报工: Factory,
  成品入库: Package,
  销售发货: Truck,
  质检: CheckCircle2,
  默认: Clock,
};

const eventColors: Record<string, string> = {
  原材料入库: 'bg-blue-500',
  小料拆分: 'bg-purple-500',
  生产领料: 'bg-orange-500',
  投料: 'bg-yellow-500',
  生产报工: 'bg-green-500',
  成品入库: 'bg-green-600',
  销售发货: 'bg-teal-500',
  质检: 'bg-emerald-500',
};

export function QRCodeTrace({
  qrCode: initialQRCode,
  showDialog: externalShowDialog,
  onDialogChange,
  initialQRCode: propQRCode,
}: QRCodeTraceProps) {
  const { toast } = useToast();
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [inputQRCode, setInputQRCode] = useState(propQRCode || initialQRCode || '');

  const showDialog = externalShowDialog ?? internalShowDialog;
  const setShowDialog = (open: boolean) => {
    if (onDialogChange) {
      onDialogChange(open);
    } else {
      setInternalShowDialog(open);
    }
  };

  const qrCode = propQRCode || initialQRCode || inputQRCode;

  const handleTrace = async () => {
    if (!qrCode) {
      toast({ title: '请输入二维码编码', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ qr_code: qrCode });
      const res = await fetch('/api/qrcode/trace?' + params);
      const result = await res.json();

      if (result.success) {
        setTraceData(result.data);
        if (!result.data?.timeline?.length) {
          toast({ title: '未找到追溯记录' });
        }
      } else {
        toast({ title: '查询失败', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '查询失败', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrace();
    }
  };

  useEffect(() => {
    if (qrCode && showDialog) {
      handleTrace();
    }
  }, [qrCode, showDialog]);

  const renderTimeline = () => {
    if (!traceData?.timeline?.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>暂无追溯记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {traceData.timeline.map((event, index) => {
          const IconComponent = eventIcons[event.event] || eventIcons['默认'];
          const colorClass = eventColors[event.event] || 'bg-gray-500';

          return (
            <div key={index} className="flex gap-4">
              {/* 时间线节点 */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full ${colorClass} flex items-center justify-center text-white`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                {index < traceData.timeline.length - 1 && <div className="w-0.5 h-16 bg-border" />}
              </div>

              {/* 时间线内容 */}
              <div className="flex-1 pb-6">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{event.event}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.time).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.operator}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${event.result === 'success' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {event.result === 'success' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {event.result === 'success' ? '成功' : '失败'}
                    </span>
                  </div>
                  {event.message && (
                    <div className="mt-2 text-sm text-muted-foreground">{event.message}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {!showDialog && (
        <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
          <Search className="h-4 w-4 mr-1" />
          追溯查询
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>二维码追溯查询</DialogTitle>
          </DialogHeader>

          {/* 搜索区域 */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={inputQRCode}
                onChange={(e) => setInputQRCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入二维码编码进行追溯..."
                className="pl-10 font-mono"
              />
            </div>
            <Button onClick={handleTrace} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              查询
            </Button>
          </div>

          {traceData ? (
            <Tabs defaultValue="timeline">
              <TabsList className="w-full">
                <TabsTrigger value="timeline">追溯时间线</TabsTrigger>
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="related">关联记录</TabsTrigger>
                <TabsTrigger value="inventory">库存信息</TabsTrigger>
              </TabsList>

              {/* 时间线视图 */}
              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">追溯链路</CardTitle>
                      <div className="flex items-center gap-2">
                        <QRCodeSVG value={qrCode} size={60} level="H" />
                        <div className="text-sm">
                          <div className="font-mono font-medium">{qrCode}</div>
                          <Badge variant="outline" className="mt-1">
                            {QRCodeTypeLabels[traceData.record?.qr_type as any] ||
                              traceData.record?.qr_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>{renderTimeline()}</CardContent>
                </Card>
              </TabsContent>

              {/* 基本信息 */}
              <TabsContent value="info" className="mt-4">
                {traceData.record ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">二维码编码：</span>
                        <span className="font-mono">{traceData.record.qr_code}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">类型：</span>
                        <Badge variant="outline">
                          {QRCodeTypeLabels[traceData.record.qr_type as any] ||
                            traceData.record.qr_type}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">状态：</span>
                        <Badge
                          variant={QRCodeStatusLabels[traceData.record.status as any]?.variant}
                        >
                          {QRCodeStatusLabels[traceData.record.status as any]?.label}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">关联单号：</span>
                        {traceData.record.ref_no || '-'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">批次号：</span>
                        {traceData.record.batch_no || '-'}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">物料名称：</span>
                        {traceData.record.material_name || '-'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">规格：</span>
                        {traceData.record.specification || '-'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">数量：</span>
                        {traceData.record.quantity} {traceData.record.unit || ''}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">仓库：</span>
                        {traceData.record.warehouse_name || '-'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">供应商：</span>
                        {traceData.record.supplier_name || '-'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无基本信息</div>
                )}
              </TabsContent>

              {/* 关联记录 */}
              <TabsContent value="related" className="mt-4">
                {traceData.related_records?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>二维码</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>单号</TableHead>
                        <TableHead>物料</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.related_records.map((record, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{record.qr_code}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {QRCodeTypeLabels[record.qr_type as any] || record.qr_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.ref_no || '-'}
                          </TableCell>
                          <TableCell>{record.material_name || '-'}</TableCell>
                          <TableCell>{record.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={QRCodeStatusLabels[record.status as any]?.variant}>
                              {QRCodeStatusLabels[record.status as any]?.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无关联记录</div>
                )}
              </TabsContent>

              {/* 库存信息 */}
              <TabsContent value="inventory" className="mt-4">
                {traceData.inventory?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>仓库</TableHead>
                        <TableHead>物料编码</TableHead>
                        <TableHead>物料名称</TableHead>
                        <TableHead className="text-right">库存数量</TableHead>
                        <TableHead>单位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.inventory.map((inv, i) => (
                        <TableRow key={i}>
                          <TableCell>{inv.warehouse_name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{inv.material_code}</TableCell>
                          <TableCell>{inv.material_name}</TableCell>
                          <TableCell className="text-right">{inv.quantity}</TableCell>
                          <TableCell>{inv.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无库存信息</div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>请输入二维码编码进行追溯查询</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
