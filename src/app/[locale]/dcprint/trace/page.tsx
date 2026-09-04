'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { QrCode, Search, Printer, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const ts = useTranslations('Dcprint');
  // 翻译钩子
  const tc = useTranslations('Common');

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
      const response = await authFetch('/api/dcprint/trace');
      const result = await response.json();
      if (result.success) {
        setRecords(result.data.list || []);
      }
    } catch {}
  };

  const handleScanQRCode = async () => {
    if (!qrCode.trim()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 解析二维码内容
      let qrData: Loose;
      try {
        qrData = JSON.parse(qrCode);
      } catch {
        qrData = { ID: qrCode, TYPE: '4' };
      }

      // 执行追溯查询
      const response = await authFetch('/api/dcprint/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNo: qrData.ID,
          traceType: 'forward',
          operatorId: 1,
          operatorName: ts('k_en6vuk'),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTraceResult(result.data);
        setSuccess(ts('k_j3zhxu'));
        fetchRecords();
      } else {
        setError(result.message || ts('k_ivnf5c'));
        setTraceResult(null);
      }
    } catch {
      setError(ts('k_ivnf5c'));
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
    alert(ts('k_nhn0cj'));
  };

  return (
    <MainLayout title={ts('k_1iaqhub')}>
      <div className="space-y-6">
        {/* 扫码追溯区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {ts('k_rhsmj5')}</CardTitle>
            <CardDescription>{tc('dcTraceScanDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 二维码输入 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">{tc('dcQrInputLabel')}</label>
                  <Input
                    ref={qrInputRef}
                    placeholder={ts('k_1f5zsbg')}
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanQRCode()}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {ts('k_1wq9feq')}</Button>
                  <Button onClick={handleScanQRCode} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {ts('k_bb05tx')}</Button>
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
                    <CardTitle>{ts('k_9s4onu')}</CardTitle>
                    <CardDescription>
                      {tc('dcTraceNoPrefix')}
                      {traceResult.traceNo}
                    </CardDescription>
                  </div>
                  <Button onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    {ts('k_18ioznh')}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 流程卡信息 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{ts('k_q3ivm0')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_1wr50ow')}</span>
                          <span className="font-medium">{traceResult.card.cardNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_jzt8aw')}</span>
                          <span className="font-medium">{traceResult.card.workOrderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_1kiv8l6')}</span>
                          <span className="font-medium">{traceResult.card.productCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_ksjvvz')}</span>
                          <span className="font-medium">{traceResult.card.productName}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 主材信息 */}
                  <Card className="border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{ts('k_17hv1vq')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_3oet4n')}</span>
                          <span className="font-medium">{traceResult.mainMaterial.labelNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_fqm675')}</span>
                          <span className="font-medium">
                            {traceResult.mainMaterial.materialCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_a60ciy')}</span>
                          <span className="font-medium">
                            {traceResult.mainMaterial.materialName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{tc('specification')}</span>
                          <span className="font-medium">
                            {traceResult.mainMaterial.specification}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_1glawu1')}</span>
                          <span className="font-medium">{traceResult.mainMaterial.batchNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{tc('supplier')}</span>
                          <span className="font-medium">
                            {traceResult.mainMaterial.supplierName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{ts('k_1k8gh4h')}</span>
                          <span className="font-medium">
                            {traceResult.mainMaterial.receiveDate}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 统计信息 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{tc('dcStatsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">{tc('dcMainCount')}</div>
                          <div className="text-2xl font-bold text-green-600">
                            {traceResult.materials.filter((m) => m.materialType === 'main').length}
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">{tc('dcAuxCount')}</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {
                              traceResult.materials.filter((m) => m.materialType === 'auxiliary')
                                .length
                            }
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">{ts('k_vrpz58')}</div>
                          <div className="text-2xl font-bold">{traceResult.materials.length}</div>
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
                <CardTitle>{ts('k_1l65urb')}</CardTitle>
                <CardDescription>{tc('dcMaterialDetailDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ts('k_3oet4n')}</TableHead>
                        <TableHead>{tc('type')}</TableHead>
                        <TableHead>{ts('k_fqm675')}</TableHead>
                        <TableHead>{ts('k_a60ciy')}</TableHead>
                        <TableHead>{tc('specification')}</TableHead>
                        <TableHead>{ts('k_1glawu1')}</TableHead>
                        <TableHead>{tc('supplier')}</TableHead>
                        <TableHead>{ts('k_1k8gh4h')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceResult.materials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            {ts('k_1uojms7')}</TableCell>
                        </TableRow>
                      ) : (
                        traceResult.materials.map((material, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{material.labelNo}</TableCell>
                            <TableCell>
                              {material.materialType === 'main' ? (
                                <Badge className="bg-green-100 text-green-700">{ts('k_1gqlef2')}</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700">{ts('k_14rp9uj')}</Badge>
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
            <CardTitle>{ts('k_1upxefi')}</CardTitle>
            <CardDescription>{tc('dcTraceRecordDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc('dcTraceNoHead')}</TableHead>
                    <TableHead>{ts('k_1wr50ow')}</TableHead>
                    <TableHead>{ts('k_jzt8aw')}</TableHead>
                    <TableHead>{ts('k_1kiv8l6')}</TableHead>
                    <TableHead>{tc('dcTraceTypeHead')}</TableHead>
                    <TableHead>{ts('k_en6vuk')}</TableHead>
                    <TableHead>{ts('k_1onwh1j')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {ts('k_6tzr61')}</TableCell>
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
                            <Badge className="bg-blue-100 text-blue-700">{ts('k_1yh2yft')}</Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-700">{ts('k_19f7liv')}</Badge>
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
