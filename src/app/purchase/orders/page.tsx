'use client';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Send,
  FileText,
  Download,
} from 'lucide-react';
import { useState } from 'react';

// 采购订单数据
const purchaseOrders = [
  {
    id: 'PO20240115001',
    supplier: '上海材料供应商',
    orderDate: '2024-01-15',
    expectedDate: '2024-01-18',
    totalAmount: 125000,
    status: 'sent',
    items: 3,
  },
  {
    id: 'PO20240114002',
    supplier: '广州化工',
    orderDate: '2024-01-14',
    expectedDate: '2024-01-17',
    totalAmount: 45000,
    status: 'partial',
    items: 2,
  },
  {
    id: 'PO20240113001',
    supplier: '深圳油墨厂',
    orderDate: '2024-01-13',
    expectedDate: '2024-01-15',
    totalAmount: 32000,
    status: 'completed',
    items: 1,
  },
  {
    id: 'PO20240112001',
    supplier: '上海材料供应商',
    orderDate: '2024-01-12',
    expectedDate: '2024-01-15',
    totalAmount: 85000,
    status: 'completed',
    items: 4,
  },
];

// 供应商列表 - 与供应商管理页面数据保持一致
const suppliers = [
  { code: 'S-20240501-001', name: '金鹰薄膜有限公司', shortName: '金鹰', grade: 'S', status: 'ACTIVE' },
  { code: 'S-20240501-002', name: '华达油墨科技有限公司', shortName: '华达', grade: 'A', status: 'ACTIVE' },
  { code: 'S-20240501-003', name: '恒通包装材料厂', shortName: '恒通', grade: 'B', status: 'ACTIVE' },
  { code: 'S-20240501-004', name: '伟业辅料供应商', shortName: '伟业', grade: 'C', status: 'SUSPENDED' },
  { code: 'S-20240501-005', name: '问题原料有限公司', shortName: '问题原料', grade: 'D', status: 'BLACKLISTED' },
];

// 物料列表
const materials = [
  { code: 'M001', name: 'PET膜-透明', unit: '㎡', price: 12 },
  { code: 'M002', name: '胶水-A型', unit: 'kg', price: 45 },
  { code: 'M003', name: '蓝色油墨', unit: 'kg', price: 180 },
];

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
    sent: { label: '已发送', className: 'bg-blue-100 text-blue-700' },
    partial: { label: '部分到货', className: 'bg-orange-100 text-orange-700' },
    completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function PurchaseOrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQRPreviewOpen, setIsQRPreviewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof purchaseOrders[0] | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [orders, setOrders] = useState(purchaseOrders);
  const [orderItems, setOrderItems] = useState([
    { id: 1, materialCode: '', quantity: 0, unit: '㎡', price: 0 }
  ]);

  const handleViewDetail = (order: typeof purchaseOrders[0]) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleEdit = (order: typeof purchaseOrders[0]) => {
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const handleGeneratePDF = async (order: typeof purchaseOrders[0]) => {
    setSelectedOrder(order);
    try {
      const response = await fetch('/api/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchase_order',
          id: order.id,
          data: {
            supplier: order.supplier,
            orderDate: order.orderDate,
            totalAmount: order.totalAmount
          }
        })
      });
      const result = await response.json();
      if (result.success && result.data.qrCodeUrl) {
        setQrCodeUrl(result.data.qrCodeUrl);
        setIsQRPreviewOpen(true);
      } else {
        alert('生成失败：' + (result.message || '未知错误'));
      }
    } catch (error) {
      alert('生成失败，请稍后重试');
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && selectedOrder) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>采购单送货码 - ${selectedOrder.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .qr-code { 
              width: 200px; 
              height: 200px; 
              margin: 20px auto;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .info {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .order-id {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin: 15px 0;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">采购单送货码</div>
            <div class="order-id">${selectedOrder.id}</div>
            <img src="${qrCodeUrl}" alt="二维码" class="qr-code" />
            <div class="info">供应商: ${selectedOrder.supplier}</div>
            <div class="info">下单日期: ${selectedOrder.orderDate}</div>
            <div class="info">金额: ¥${selectedOrder.totalAmount.toLocaleString()}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleExportPDF = (order: typeof purchaseOrders[0]) => {
    alert(`正在导出采购单 ${order.id} 的PDF...`);
  };

  const handleDelete = (order: typeof purchaseOrders[0]) => {
    if (confirm(`确定要删除采购单 ${order.id} 吗？`)) {
      setOrders(prev => prev.filter(o => o.id !== order.id));
    }
  };

  const handleAddItem = () => {
    setOrderItems(prev => [
      ...prev,
      { id: Date.now(), materialCode: '', quantity: 0, unit: '㎡', price: 0 }
    ]);
  };

  const handleRemoveItem = (id: number) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: string | number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'materialCode') {
          const material = materials.find(m => m.code === value);
          if (material) {
            updated.unit = material.unit;
            updated.price = material.price;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  return (
    <MainLayout title="采购订单">
      <div className="space-y-6">
        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索采购单号、供应商..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="订单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="sent">已发送</SelectItem>
                    <SelectItem value="partial">部分到货</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新建采购单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>新建采购订单</DialogTitle>
                      <DialogDescription>创建采购订单并生成PDF送货二维码</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>供应商 *</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择供应商" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers
                                .filter((s) => s.status === 'ACTIVE')
                                .map((s) => (
                                  <SelectItem key={s.code} value={s.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{s.name}</span>
                                      <Badge 
                                        className={
                                          s.grade === 'S' ? 'bg-yellow-500 text-white text-xs' :
                                          s.grade === 'A' ? 'bg-gray-400 text-white text-xs' :
                                          s.grade === 'B' ? 'bg-orange-400 text-white text-xs' :
                                          'bg-orange-500 text-white text-xs'
                                        }
                                      >
                                        {s.grade}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>期望到货日期</Label>
                          <Input type="date" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>采购明细</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>物料</TableHead>
                              <TableHead className="w-[120px]">数量</TableHead>
                              <TableHead className="w-[80px]">单位</TableHead>
                              <TableHead className="w-[120px]">单价</TableHead>
                              <TableHead className="w-[120px]">金额</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Select 
                                    value={item.materialCode} 
                                    onValueChange={(value) => handleItemChange(item.id, 'materialCode', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择物料" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {materials.map((m) => (
                                        <SelectItem key={m.code} value={m.code}>
                                          {m.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={item.quantity || ''}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={item.price || ''}
                                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {(item.quantity * item.price).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={orderItems.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加物料
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>备注</Label>
                        <Input placeholder="采购备注..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        取消
                      </Button>
                      <Button variant="outline">保存草稿</Button>
                      <Button onClick={() => setIsCreateOpen(false)}>
                        <Send className="h-4 w-4 mr-2" />
                        发送给供应商
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 采购订单列表 */}
        <Card>
          <CardHeader>
            <CardTitle>采购订单列表</CardTitle>
            <CardDescription>共 {orders.length} 条采购记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>采购单号</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>下单日期</TableHead>
                  <TableHead>期望到货</TableHead>
                  <TableHead className="text-center">物料数</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.id}</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>{order.expectedDate}</TableCell>
                    <TableCell className="text-center">{order.items}</TableCell>
                    <TableCell className="text-right font-medium">
                      ¥{order.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(order)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGeneratePDF(order)}>
                            <FileText className="h-4 w-4 mr-2" />
                            生成PDF送货码
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportPDF(order)}>
                            <Download className="h-4 w-4 mr-2" />
                            导出PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(order)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 查看详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>采购单详情</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">采购单号</Label>
                    <p className="font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">供应商</Label>
                    <p>{selectedOrder.supplier}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">下单日期</Label>
                    <p>{selectedOrder.orderDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">期望到货</Label>
                    <p>{selectedOrder.expectedDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">物料数</Label>
                    <p>{selectedOrder.items}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">金额</Label>
                    <p className="font-medium">¥{selectedOrder.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">状态</Label>
                    <p>{getStatusBadge(selectedOrder.status)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑采购单</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>供应商</Label>
                  <Select defaultValue={selectedOrder.supplier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.filter(s => s.status === 'ACTIVE').map((s) => (
                        <SelectItem key={s.code} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>期望到货日期</Label>
                  <Input type="date" defaultValue={selectedOrder.expectedDate} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>取消</Button>
                  <Button onClick={() => setIsEditOpen(false)}>保存</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 二维码预览对话框 */}
        <Dialog open={isQRPreviewOpen} onOpenChange={setIsQRPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>采购单送货码</DialogTitle>
              <DialogDescription>
                {selectedOrder?.id} - {selectedOrder?.supplier}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="二维码" 
                  className="w-48 h-48 border rounded-lg"
                />
              )}
              <div className="text-center text-sm text-muted-foreground">
                <p>供应商: {selectedOrder?.supplier}</p>
                <p>下单日期: {selectedOrder?.orderDate}</p>
                <p>金额: ¥{selectedOrder?.totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsQRPreviewOpen(false)}>
                  关闭
                </Button>
                <Button onClick={handlePrintQR}>
                  <FileText className="h-4 w-4 mr-2" />
                  打印
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
