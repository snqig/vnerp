'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Search,
  FileText,
  Printer,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// 追溯结果类型
interface TraceResult {
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

// 追溯记录类型
interface TraceRecord {
  id: number;
  traceNo: string;
  cardNo?: string;
  workOrderNo?: string;
  productCode?: string;
  traceType: string;
  operatorName?: string;
  traceTime?: string;
}

export default function TracePage() {
  const [qrCode, setQrCode] = useState('');
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRecords();
    qrInputRef.current?.focus();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/dcprint/trace');
      const result = await response.json();
      if (result.success) {
        setRecords(result.data.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  const handleScanQRCode = async () => {
    if (!qrCode.trim()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 解析二维码内容
      let qrData: any;
      try {
        qrData = JSON.parse(qrCode);
      } catch {
        qrData = { ID: qrCode, TYPE: '4' };
      }

      // 执行追溯查询
      const response = await fetch('/api/dcprint/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNo: qrData.ID,
          traceType: 'forward',
          operatorId: 1,
          operatorName: '操作员',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTraceResult(result.data);
        setSuccess('追溯查询成功！');
        fetchRecords();
      } else {
        setError(result.message || '追溯查询失败');
        setTraceResult(null);
      }
    } catch (err) {
      setError('追溯查询失败');
      setTraceResult(null);
    } finally {
      setLoading(false);
      setQrCode('');
      qrInputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setQrCode('');
    setTraceResult(null);
    setError('');
    setSuccess('');
    qrInputRef.current?.focus();
  };

  const handlePrint = () => {
    // TODO: 实现打印功能
    alert('打印功能待实现');
  };

  return (
    <MainLayout title="物料追溯">
      <div className="space-y-6">
        {/* 扫码追溯区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              扫码追溯
            </CardTitle>
            <CardDescription>
              扫描流程卡二维码进行物料追溯查询
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 二维码输入 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">流程卡二维码</label>
                  <Input
                    ref={qrInputRef}
                    placeholder="请扫描流程卡二维码..."
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanQRCode()}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重置
                  </Button>
                  <Button onClick={handleScanQRCode} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    追溯
                  </Button>
                </div>
              </div>

              {/* 提示信息 */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 追溯结果 */}
        {traceResult && (
          <div className="space-y-6">
            {/* 追溯单信息 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>追溯结果</CardTitle>
                    <CardDescription>
                      追溯单号: {traceResult.traceNo}
                    </CardDescription>
                  </div>
                  <Button onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    打印追溯单
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 流程卡信息 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">流程卡信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">流程卡卡号</span>
                          <span className="font-medium">{traceResult.card.cardNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">工单号</span>
                          <span className="font-medium">{traceResult.card.workOrderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">成品料号</span>
                          <span className="font-medium">{traceResult.card.productCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">成品名称</span>
                          <span className="font-medium">{traceResult.card.productName}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 主材信息 */}
                  <Card className="border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">主材信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">标签编号</span>
                          <span className="font-medium">{traceResult.mainMaterial.labelNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">物料代号</span>
                          <span className="font-medium">{traceResult.mainMaterial.materialCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">物料名称</span>
                          <span className="font-medium">{traceResult.mainMaterial.materialName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">规格</span>
                          <span className="font-medium">{traceResult.mainMaterial.specification}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">批号</span>
                          <span className="font-medium">{traceResult.mainMaterial.batchNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">供应商</span>
                          <span className="font-medium">{traceResult.mainMaterial.supplierName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">进料日期</span>
                          <span className="font-medium">{traceResult.mainMaterial.receiveDate}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 统计信息 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">物料统计</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">主材数量</div>
                          <div className="text-2xl font-bold text-green-600">
                            {traceResult.materials.filter(m => m.materialType === 'main').length}
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">辅料数量</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {traceResult.materials.filter(m => m.materialType === 'auxiliary').length}
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">物料总数</div>
                          <div className="text-2xl font-bold">
                            {traceResult.materials.length}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* 物料明细 */}
            <Card>
              <CardHeader>
                <CardTitle>物料明细</CardTitle>
                <CardDescription>该流程卡使用的所有物料</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>标签编号</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>物料代号</TableHead>
                        <TableHead>物料名称</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>批号</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead>进料日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceResult.materials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            暂无物料数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        traceResult.materials.map((material, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{material.labelNo}</TableCell>
                            <TableCell>
                              {material.materialType === 'main' ? (
                                <Badge className="bg-green-100 text-green-700">主材</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700">辅料</Badge>
                              )}
                            </TableCell>
                            <TableCell>{material.materialCode}</TableCell>
                            <TableCell>{material.materialName}</TableCell>
                            <TableCell>{material.specification}</TableCell>
                            <TableCell>{material.batchNo}</TableCell>
                            <TableCell>{material.supplierName}</TableCell>
                            <TableCell>{material.receiveDate}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 追溯记录列表 */}
        <Card>
          <CardHeader>
            <CardTitle>追溯记录</CardTitle>
            <CardDescription>历史追溯查询记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>追溯单号</TableHead>
                    <TableHead>流程卡卡号</TableHead>
                    <TableHead>工单号</TableHead>
                    <TableHead>成品料号</TableHead>
                    <TableHead>追溯类型</TableHead>
                    <TableHead>操作员</TableHead>
                    <TableHead>追溯时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.traceNo}</TableCell>
                        <TableCell>{record.cardNo}</TableCell>
                        <TableCell>{record.workOrderNo}</TableCell>
                        <TableCell>{record.productCode}</TableCell>
                        <TableCell>
                          {record.traceType === 'forward' ? (
                            <Badge className="bg-blue-100 text-blue-700">正向追溯</Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-700">反向追溯</Badge>
                          )}
                        </TableCell>
                        <TableCell>{record.operatorName}</TableCell>
                        <TableCell>{record.traceTime}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
