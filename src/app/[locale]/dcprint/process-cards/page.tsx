'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QrCode,
  FileText,
  Printer,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { mockProcessCards, USE_MOCK } from '@/lib/mock-data';

// 流程卡类型
interface ProcessCard {
  id: number;
  cardNo: string;
  workOrderNo: string;
  productCode?: string;
  productName?: string;
  materialSpec?: string;
  planQty?: number;
  mainLabelNo?: string;
  mainMaterialCode?: string;
  mainMaterialName?: string;
  mainBatchNo?: string;
  burdeningStatus: string;
  lockStatus: string;
  createUserName?: string;
  createTime?: string;
}

// 工单类型
interface WorkOrder {
  id: number;
  orderNo: string;
  productCode?: string;
  productName?: string;
  specification?: string;
  quantity?: number;
}

// 物料标签类型
interface MaterialLabel {
  id: number;
  labelNo: string;
  materialCode: string;
  materialName?: string;
  specification?: string;
  batchNo?: string;
  isMainMaterial: number;
}

export default function ProcessCardsPage() {

  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  const [qrCode, setQrCode] = useState('');
  const [scanState, setScanState] = useState<'workOrder' | 'mainMaterial' | 'auxiliary'>(
    'workOrder'
  );
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [mainMaterial, setMainMaterial] = useState<MaterialLabel | null>(null);
  const [auxiliaryMaterials, setAuxiliaryMaterials] = useState<MaterialLabel[]>([]);
  const [cards, setCards] = useState<ProcessCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ProcessCard | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCards();
    qrInputRef.current?.focus();
  }, []);

  const fetchCards = async () => {
    try {
      if (USE_MOCK) {
        logger.info({ module: 'Dcprint', action: 'fetchProcessCards' }, '使用 mock 流程卡数据');
        setCards(mockProcessCards);
        return;
      }

      const response = await authFetch('/api/dcprint/process-cards');
      const result = await response.json();
      if (result.success) {
        setCards(result.data.list || []);
        logger.info({ module: 'Dcprint', action: 'fetchProcessCards' }, '流程卡数据获取成功', { count: (result.data.list || []).length });
      }
    } catch (error) {
      logger.error({ module: 'Dcprint', action: 'fetchProcessCards' }, '获取流程卡数据失败', { error: (error as Error).message });
    }
  };

  const handleScanQRCode = async () => {
    if (!qrCode.trim()) return;

    setError('');
    setLoading(true);

    try {
      const response = await authFetch('/api/dcprint/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrContent: qrCode,
          scanType: 'process',
        }),
      });

      const result = await response.json();

      if (result.success) {
        const type = result.data.type;
        const data = result.data.data;

        if (scanState === 'workOrder') {
          if (type === '3') {
            setWorkOrder(data);
            setScanState('mainMaterial');
            setSuccess(t('workOrderScanSuccess'));
          } else {
            setError(t('pleaseScanWorkOrderFirst'));
          }
        } else if (scanState === 'mainMaterial') {
          if (type === '0' || type === '1' || type === '2') {
            if (data.isMainMaterial === 1) {
              setMainMaterial(data);
              setScanState('auxiliary');
              setSuccess(t('mainMaterialScanSuccess'));
            } else {
              setError(t('notMainMaterialLabel'));
            }
          } else if (type === '3') {
            // 切换工单
            setWorkOrder(data);
            setMainMaterial(null);
            setAuxiliaryMaterials([]);
            setSuccess(t('workOrderSwitchSuccess'));
          } else {
            setError(t('pleaseScanMaterialLabel'));
          }
        } else if (scanState === 'auxiliary') {
          if (type === '0' || type === '1' || type === '2') {
            // 添加辅料
            if (!auxiliaryMaterials.find((m) => m.id === data.id)) {
              setAuxiliaryMaterials([...auxiliaryMaterials, data]);
              setSuccess(t('auxiliaryAdded', { name: data.materialName }));
            } else {
              setError(t('auxiliaryAlreadyAdded'));
            }
          } else if (type === '3') {
            // 切换工单
            setWorkOrder(data);
            setMainMaterial(null);
            setAuxiliaryMaterials([]);
            setScanState('mainMaterial');
            setSuccess(t('workOrderSwitchSuccess'));
          } else if (type === '4') {
            // 查看流程卡详情
            setSelectedCard(data);
            setShowDetail(true);
          }
        }
      } else {
        setError(result.message || tc('scanFailed'));
      }
    } catch (err) {
      setError(t('scanQueryFailed'));
    } finally {
      setLoading(false);
      setQrCode('');
      qrInputRef.current?.focus();
    }
  };

  const handleGenerateCard = async () => {
    if (!workOrder || !mainMaterial) {
      setError(t('pleaseScanWorkOrderAndMain'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/dcprint/process-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          workOrderNo: workOrder.orderNo,
          productCode: workOrder.productCode,
          productName: workOrder.productName,
          materialSpec: workOrder.specification,
          planQty: workOrder.quantity,
          mainLabelId: mainMaterial.id,
          mainLabelNo: mainMaterial.labelNo,
          createUserId: 1,
          createUserName: t('operator'),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(t('cardGeneratedSuccess'));
        fetchCards();
        handleReset();
      } else {
        setError(result.message || t('generateFailed'));
      }
    } catch (err) {
      setError(t('generateCardFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQrCode('');
    setScanState('workOrder');
    setWorkOrder(null);
    setMainMaterial(null);
    setAuxiliaryMaterials([]);
    setError('');
    setSuccess('');
    qrInputRef.current?.focus();
  };

  const removeAuxiliaryMaterial = (id: number) => {
    setAuxiliaryMaterials(auxiliaryMaterials.filter((m) => m.id !== id));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: t('notBurdened'),
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      },
      completed: {
        label: t('burdened'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
    };
    const config = statusMap[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getLockBadge = (lockStatus: string) => {
    return lockStatus ? (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{t('locked')}</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        {t('unlocked')}
      </Badge>
    );
  };

  return (
    <MainLayout title={t('processCard')}>
      <div className="space-y-6">
        {/* 扫码生成区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('scanGenerateCard')}
            </CardTitle>
            <CardDescription>{t('scanSequenceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 扫码步骤指示 */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    scanState === 'workOrder' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">1. {t('scanWorkOrder')}</span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    scanState === 'mainMaterial'
                      ? 'bg-blue-100 text-blue-700'
                      : scanState === 'auxiliary'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100'
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span className="font-medium">2. {t('scanMainMaterial')}</span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    scanState === 'auxiliary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">3. {t('addAuxiliaryOptional')}</span>
                </div>
              </div>

              {/* 二维码输入 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    ref={qrInputRef}
                    placeholder={t('pleaseScanQR')}
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanQRCode()}
                    disabled={loading}
                  />
                </div>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tc('reset')}
                </Button>
                <Button
                  onClick={handleGenerateCard}
                  disabled={!workOrder || !mainMaterial || loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('generateCard')}
                </Button>
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

              {/* 已扫描信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 工单信息 */}
                <Card className={workOrder ? 'border-blue-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('workOrderInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workOrder ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('workOrderNo')}</span>
                          <span className="font-medium">{workOrder.orderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('productCode')}</span>
                          <span className="font-medium">{workOrder.productCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('productName')}</span>
                          <span className="font-medium">{workOrder.productName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('productionQty')}</span>
                          <span className="font-medium">{workOrder.quantity}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">{t('pleaseScanWorkOrder')}</div>
                    )}
                  </CardContent>
                </Card>

                {/* 主材信息 */}
                <Card className={mainMaterial ? 'border-green-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('mainMaterialInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mainMaterial ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('labelNo')}</span>
                          <span className="font-medium">{mainMaterial.labelNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('materialCode')}</span>
                          <span className="font-medium">{mainMaterial.materialCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('materialName')}</span>
                          <span className="font-medium">{mainMaterial.materialName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{tc('batchNo')}</span>
                          <span className="font-medium">{mainMaterial.batchNo}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">{t('pleaseScanMainMaterial')}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 辅料列表 */}
              {auxiliaryMaterials.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {t('addedAuxiliary')} ({auxiliaryMaterials.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {auxiliaryMaterials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{material.materialName}</span>
                            <span className="text-sm text-muted-foreground">
                              {material.materialCode}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {tc('batchNo')}: {material.batchNo}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAuxiliaryMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 流程卡列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cardList')}</CardTitle>
            <CardDescription>{t('generatedCards')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('cardNo')}</TableHead>
                    <TableHead>{t('workOrderNo')}</TableHead>
                    <TableHead>{t('productCode')}</TableHead>
                    <TableHead>{t('mainLabel')}</TableHead>
                    <TableHead>{t('burdeningStatus')}</TableHead>
                    <TableHead>{t('lockStatus')}</TableHead>
                    <TableHead>{tc("createdBy")}</TableHead>
                    <TableHead>{tc("createdAt")}</TableHead>
                    <TableHead>{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {tc('noRecords')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.cardNo}</TableCell>
                        <TableCell>{card.workOrderNo}</TableCell>
                        <TableCell>{card.productCode}</TableCell>
                        <TableCell>{card.mainLabelNo}</TableCell>
                        <TableCell>{getStatusBadge(card.burdeningStatus)}</TableCell>
                        <TableCell>{getLockBadge(card.lockStatus)}</TableCell>
                        <TableCell>{card.createUserName}</TableCell>
                        <TableCell>{card.createTime}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
