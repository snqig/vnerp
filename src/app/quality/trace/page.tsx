'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Scan,
  QrCode,
  Layers,
  Package,
  Factory,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

interface TraceRecord {
  id: number;
  trace_no: string;
  card_no: string;
  work_order_no: string;
  product_code: string;
  product_name?: string;
  main_label_id: number;
  main_material_code?: string;
  main_material_name?: string;
  main_batch_no?: string;
  trace_type: number;
  operator_name: string;
  trace_time: string;
  remark: string;
}

interface TraceDetail {
  traceNo: string;
  card: {
    cardNo: string;
    workOrderNo: string;
    productCode?: string;
    productName?: string;
  };
  mainMaterial: {
    labelNo: string;
    materialCode?: string;
    materialName?: string;
    specification?: string;
    batchNo?: string;
    supplierName?: string;
    receiveDate?: string;
  };
  materials: {
    labelNo: string;
    materialType: string;
    materialCode?: string;
    materialName?: string;
    specification?: string;
    batchNo?: string;
    supplierName?: string;
    receiveDate?: string;
    quantity?: number;
    unit?: string;
  }[];
}

const TRACE_TYPE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '正向追溯', color: 'bg-blue-100 text-blue-800' },
  2: { label: '反向追溯', color: 'bg-purple-100 text-purple-800' },
};

export default function TracePage() {
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [traceResult, setTraceResult] = useState<TraceDetail | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [traceTypeFilter, setTraceTypeFilter] = useState('all');

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (traceTypeFilter !== 'all') params.set('traceType', traceTypeFilter);
      params.set('pageSize', '20');
      const res = await fetch(`/api/dcprint/trace?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data?.list || data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch records:', e);
    }
  }, [keyword, traceTypeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = async () => {
    if (!scannedCode.trim()) {
      toast.error('请输入追溯码');
      return;
    }

    setLoading(true);
    setError('');
    setTraceResult(null);

    try {
      const response = await fetch('/api/dcprint/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNo: scannedCode.trim(),
          traceType: 'forward',
          operatorId: 1,
          operatorName: '操作员',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTraceResult(result.data);
        toast.success('追溯查询成功');
        setIsScanOpen(false);
        fetchRecords();
      } else {
        setError(result.message || '追溯查询失败');
      }
    } catch (err) {
      setError('追溯查询失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScannedCode('');
    setTraceResult(null);
    setError('');
  };

  const handleViewRecord = async (record: TraceRecord) => {
    setScannedCode(record.card_no || record.work_order_no || '');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dcprint/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNo: record.card_no,
          traceType: record.trace_type === 2 ? 'backward' : 'forward',
          operatorId: 1,
          operatorName: '操作员',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTraceResult(result.data);
        toast.success('追溯查询成功');
      } else {
        setError(result.message || '追溯查询失败');
      }
    } catch (err) {
      setError('追溯查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="追溯查询">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="扫描/输入流程卡号、工单号..."
                    className="pl-10"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  <Layers className="h-4 w-4 mr-2" />
                  追溯
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重置
                </Button>
              </div>
              <Button variant="outline" onClick={() => setIsScanOpen(true)}>
                <Scan className="h-4 w-4 mr-2" />
                扫码追溯
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {traceResult && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="materials">原料信息</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      流程卡信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">追溯单号：</span>{traceResult.traceNo}</div>
                      <div><span className="text-muted-foreground">流程卡号：</span>{traceResult.card?.cardNo}</div>
                      <div><span className="text-muted-foreground">工单号：</span>{traceResult.card?.workOrderNo}</div>
                      <div><span className="text-muted-foreground">成品料号：</span>{traceResult.card?.productCode || '-'}</div>
                      <div><span className="text-muted-foreground">成品品名：</span>{traceResult.card?.productName || '-'}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      主材信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">标签号：</span>{traceResult.mainMaterial?.labelNo}</div>
                      <div><span className="text-muted-foreground">物料代号：</span>{traceResult.mainMaterial?.materialCode || '-'}</div>
                      <div><span className="text-muted-foreground">品名：</span>{traceResult.mainMaterial?.materialName || '-'}</div>
                      <div><span className="text-muted-foreground">规格：</span>{traceResult.mainMaterial?.specification || '-'}</div>
                      <div><span className="text-muted-foreground">批号：</span>{traceResult.mainMaterial?.batchNo || '-'}</div>
                      <div><span className="text-muted-foreground">供应商：</span>{traceResult.mainMaterial?.supplierName || '-'}</div>
                      <div><span className="text-muted-foreground">进料日期：</span>{traceResult.mainMaterial?.receiveDate || '-'}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {traceResult.materials && traceResult.materials.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>物料追溯链路</CardTitle>
                    <CardDescription>从主材到成品的完整追溯路径</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between overflow-x-auto pb-4">
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-blue-50 border border-blue-200">
                        <div className="p-2 rounded-full mb-2 bg-blue-500">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">主材</span>
                        <span className="text-xs text-muted-foreground">{traceResult.mainMaterial?.materialName}</span>
                        <span className="text-xs text-muted-foreground">{traceResult.mainMaterial?.batchNo}</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                      {traceResult.materials.filter(m => m.materialType === '2' || m.materialType === '辅料').map((mat, idx) => (
                        <div key={idx} className="flex items-center">
                          <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-green-50 border border-green-200">
                            <div className="p-2 rounded-full mb-2 bg-green-500">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium text-sm">{mat.materialName || '辅料'}</span>
                            <span className="text-xs text-muted-foreground">{mat.batchNo}</span>
                            <span className="text-xs text-muted-foreground">{mat.supplierName}</span>
                          </div>
                          {idx < traceResult.materials.filter(m => m.materialType === '2' || m.materialType === '辅料').length - 1 && (
                            <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                          )}
                        </div>
                      ))}
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-purple-50 border border-purple-200">
                        <div className="p-2 rounded-full mb-2 bg-purple-500">
                          <Factory className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">成品</span>
                        <span className="text-xs text-muted-foreground">{traceResult.card?.productName}</span>
                        <span className="text-xs text-muted-foreground">{traceResult.card?.productCode}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle>原料批次追溯</CardTitle>
                  <CardDescription>本批次产品使用的全部原料批次信息</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>标签号</TableHead>
                        <TableHead>物料类型</TableHead>
                        <TableHead>物料代号</TableHead>
                        <TableHead>品名</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>批号</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead>进料日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!traceResult.materials || traceResult.materials.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            暂无原料追溯信息
                          </TableCell>
                        </TableRow>
                      ) : (
                        traceResult.materials.map((mat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{mat.labelNo}</TableCell>
                            <TableCell>
                              <Badge className={mat.materialType === '1' || mat.materialType === '主材' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                {mat.materialType === '1' || mat.materialType === '主材' ? '主材' : '辅料'}
                              </Badge>
                            </TableCell>
                            <TableCell>{mat.materialCode || '-'}</TableCell>
                            <TableCell className="font-medium">{mat.materialName || '-'}</TableCell>
                            <TableCell>{mat.specification || '-'}</TableCell>
                            <TableCell className="font-mono">{mat.batchNo || '-'}</TableCell>
                            <TableCell>{mat.supplierName || '-'}</TableCell>
                            <TableCell>{mat.receiveDate || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>追溯记录</CardTitle>
                <CardDescription>历史追溯查询记录</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={traceTypeFilter} onValueChange={setTraceTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="追溯类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="1">正向追溯</SelectItem>
                    <SelectItem value="2">反向追溯</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>追溯单号</TableHead>
                  <TableHead>流程卡号</TableHead>
                  <TableHead>工单号</TableHead>
                  <TableHead>成品料号</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>操作员</TableHead>
                  <TableHead>追溯时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无追溯记录
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.trace_no}</TableCell>
                      <TableCell>{r.card_no || '-'}</TableCell>
                      <TableCell>{r.work_order_no || '-'}</TableCell>
                      <TableCell>{r.product_code || '-'}</TableCell>
                      <TableCell>
                        <Badge className={TRACE_TYPE_MAP[r.trace_type]?.color || 'bg-gray-100'}>
                          {TRACE_TYPE_MAP[r.trace_type]?.label || r.trace_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.operator_name || '-'}</TableCell>
                      <TableCell>{r.trace_time || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewRecord(r)}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>扫码追溯</DialogTitle>
              <DialogDescription>
                扫描流程卡二维码进行物料追溯查询
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">使用PDA扫描流程卡二维码</p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="或手动输入流程卡号..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSearch} disabled={loading}>
                追溯查询
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
