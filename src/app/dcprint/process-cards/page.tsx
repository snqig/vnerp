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
  const [qrCode, setQrCode] = useState('');
  const [scanState, setScanState] = useState<'workOrder' | 'mainMaterial' | 'auxiliary'>('workOrder');
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
      const response = await fetch('/api/dcprint/process-cards');
      const result = await response.json();
      if (result.success) {
        setCards(result.data.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };

  const handleScanQRCode = async () => {
    if (!qrCode.trim()) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/dcprint/scan', {
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
            setSuccess('工单扫描成功，请扫描主材');
          } else {
            setError('请先扫描工单二维码');
          }
        } else if (scanState === 'mainMaterial') {
          if (type === '0' || type === '1' || type === '2') {
            if (data.isMainMaterial === 1) {
              setMainMaterial(data);
              setScanState('auxiliary');
              setSuccess('主材扫描成功，可以继续扫描辅料或点击生成流程卡');
            } else {
              setError('该标签不是母材标签，不能作为主材');
            }
          } else if (type === '3') {
            // 切换工单
            setWorkOrder(data);
            setMainMaterial(null);
            setAuxiliaryMaterials([]);
            setSuccess('工单切换成功，请扫描主材');
          } else {
            setError('请扫描物料标签');
          }
        } else if (scanState === 'auxiliary') {
          if (type === '0' || type === '1' || type === '2') {
            // 添加辅料
            if (!auxiliaryMaterials.find(m => m.id === data.id)) {
              setAuxiliaryMaterials([...auxiliaryMaterials, data]);
              setSuccess(`辅料 ${data.materialName} 添加成功`);
            } else {
              setError('该辅料已添加');
            }
          } else if (type === '3') {
            // 切换工单
            setWorkOrder(data);
            setMainMaterial(null);
            setAuxiliaryMaterials([]);
            setScanState('mainMaterial');
            setSuccess('工单切换成功，请扫描主材');
          } else if (type === '4') {
            // 查看流程卡详情
            setSelectedCard(data);
            setShowDetail(true);
          }
        }
      } else {
        setError(result.message || '扫码失败');
      }
    } catch (err) {
      setError('扫码查询失败');
    } finally {
      setLoading(false);
      setQrCode('');
      qrInputRef.current?.focus();
    }
  };

  const handleGenerateCard = async () => {
    if (!workOrder || !mainMaterial) {
      setError('请扫描工单和主材');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dcprint/process-cards', {
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
          createUserName: '操作员',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('流程卡生成成功！');
        fetchCards();
        handleReset();
      } else {
        setError(result.message || '生成失败');
      }
    } catch (err) {
      setError('生成流程卡失败');
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
    setAuxiliaryMaterials(auxiliaryMaterials.filter(m => m.id !== id));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '未配料', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: '已配料', className: 'bg-green-100 text-green-700' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getLockBadge = (status: string) => {
    return status === 'locked' ? (
      <Badge className="bg-red-100 text-red-700">已锁</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-700">未锁</Badge>
    );
  };

  return (
    <MainLayout title="生产流程卡">
      <div className="space-y-6">
        {/* 扫码生成区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              扫码生成流程卡
            </CardTitle>
            <CardDescription>
              按顺序扫描工单、主材、辅料生成流程卡
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 扫码步骤指示 */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  scanState === 'workOrder' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                }`}>
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">1. 扫描工单</span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  scanState === 'mainMaterial' ? 'bg-blue-100 text-blue-700' : 
                  scanState === 'auxiliary' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                }`}>
                  <QrCode className="h-4 w-4" />
                  <span className="font-medium">2. 扫描主材</span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  scanState === 'auxiliary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                }`}>
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">3. 添加辅料（可选）</span>
                </div>
              </div>

              {/* 二维码输入 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    ref={qrInputRef}
                    placeholder="请扫描二维码..."
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanQRCode()}
                    disabled={loading}
                  />
                </div>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button
                  onClick={handleGenerateCard}
                  disabled={!workOrder || !mainMaterial || loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  生成流程卡
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
                    <CardTitle className="text-sm">工单信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workOrder ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">工单号</span>
                          <span className="font-medium">{workOrder.orderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">成品料号</span>
                          <span className="font-medium">{workOrder.productCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">成品名称</span>
                          <span className="font-medium">{workOrder.productName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">生产数量</span>
                          <span className="font-medium">{workOrder.quantity}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        请扫描工单二维码
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 主材信息 */}
                <Card className={mainMaterial ? 'border-green-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">主材信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mainMaterial ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">标签编号</span>
                          <span className="font-medium">{mainMaterial.labelNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">物料代号</span>
                          <span className="font-medium">{mainMaterial.materialCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">物料名称</span>
                          <span className="font-medium">{mainMaterial.materialName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">批号</span>
                          <span className="font-medium">{mainMaterial.batchNo}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        请扫描主材标签
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 辅料列表 */}
              {auxiliaryMaterials.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">已添加辅料 ({auxiliaryMaterials.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {auxiliaryMaterials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{material.materialName}</span>
                            <span className="text-sm text-muted-foreground">{material.materialCode}</span>
                            <span className="text-sm text-muted-foreground">批号: {material.batchNo}</span>
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
            <CardTitle>流程卡列表</CardTitle>
            <CardDescription>已生成的生产流程卡</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>流程卡卡号</TableHead>
                    <TableHead>工单号</TableHead>
                    <TableHead>成品料号</TableHead>
                    <TableHead>主材标签</TableHead>
                    <TableHead>配料状态</TableHead>
                    <TableHead>锁住状态</TableHead>
                    <TableHead>创建人</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        暂无数据
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
