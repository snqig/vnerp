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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  Download,
  Filter,
} from 'lucide-react';
import { useState } from 'react';

// 模拟订单数据
const orders = [
  {
    id: 'SO20240115001',
    customer: '深圳伟业科技有限公司',
    customerCode: 'C001',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-18',
    totalAmount: 125000,
    status: 'producing',
    items: [
      { product: '包装膜-透明', quantity: 5000, unit: '㎡', unitPrice: 25 },
    ],
  },
  {
    id: 'SO20240115002',
    customer: '广州华达包装有限公司',
    customerCode: 'C002',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-20',
    totalAmount: 85000,
    status: 'confirmed',
    items: [
      { product: '标签贴纸', quantity: 10000, unit: '张', unitPrice: 8.5 },
    ],
  },
  {
    id: 'SO20240115003',
    customer: '东莞恒通新材料',
    customerCode: 'C003',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-22',
    totalAmount: 45000,
    status: 'draft',
    items: [
      { product: '彩印膜-蓝', quantity: 3000, unit: '㎡', unitPrice: 15 },
    ],
  },
  {
    id: 'SO20240115004',
    customer: '佛山利达印刷厂',
    customerCode: 'C004',
    orderDate: '2024-01-14',
    deliveryDate: '2024-01-16',
    totalAmount: 168000,
    status: 'completed',
    items: [
      { product: '防静电膜', quantity: 8000, unit: '㎡', unitPrice: 21 },
    ],
  },
  {
    id: 'SO20240115005',
    customer: '中山新材科技',
    customerCode: 'C005',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-19',
    totalAmount: 72000,
    status: 'producing',
    items: [
      { product: '热收缩膜', quantity: 6000, unit: '㎡', unitPrice: 12 },
    ],
  },
];

const customers = [
  { code: 'C001', name: '深圳伟业科技有限公司' },
  { code: 'C002', name: '广州华达包装有限公司' },
  { code: 'C003', name: '东莞恒通新材料' },
  { code: 'C004', name: '佛山利达印刷厂' },
  { code: 'C005', name: '中山新材科技' },
];

const products = [
  { code: 'P001', name: '包装膜-透明', unit: '㎡', price: 25 },
  { code: 'P002', name: '标签贴纸', unit: '张', price: 8.5 },
  { code: 'P003', name: '彩印膜-蓝', unit: '㎡', price: 15 },
  { code: 'P004', name: '防静电膜', unit: '㎡', price: 21 },
  { code: 'P005', name: '热收缩膜', unit: '㎡', price: 12 },
];

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
    confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700' },
    producing: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
    completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
    cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function SalesOrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product: '', quantity: '', unit: '', unitPrice: '' },
  ]);

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product: '', quantity: '', unit: '', unitPrice: '' }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  return (
    <MainLayout title="销售订单">
      <div className="space-y-6">
        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索订单号、客户..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="订单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="confirmed">已确认</SelectItem>
                    <SelectItem value="producing">生产中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
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
                      新建订单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>新建销售订单</DialogTitle>
                      <DialogDescription>
                        填写订单信息，带 * 为必填项
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer">客户 *</Label>
                          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择客户" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryDate">交货日期 *</Label>
                          <Input type="date" id="deliveryDate" />
                        </div>
                      </div>
                      
                      {/* 订单明细 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>订单明细</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加明细
                          </Button>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>产品</TableHead>
                                <TableHead className="w-[120px]">数量</TableHead>
                                <TableHead className="w-[80px]">单位</TableHead>
                                <TableHead className="w-[120px]">单价</TableHead>
                                <TableHead className="w-[120px]">金额</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="选择产品" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {products.map((p) => (
                                          <SelectItem key={p.code} value={p.code}>
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input type="number" placeholder="0" />
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-muted-foreground">㎡</span>
                                  </TableCell>
                                  <TableCell>
                                    <Input type="number" placeholder="0.00" />
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">0.00</span>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOrderItem(index)}
                                      disabled={orderItems.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remarks">备注</Label>
                        <Input id="remarks" placeholder="订单备注信息..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        取消
                      </Button>
                      <Button variant="outline">保存草稿</Button>
                      <Button onClick={() => setIsCreateOpen(false)}>提交订单</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 订单列表 */}
        <Card>
          <CardHeader>
            <CardTitle>订单列表</CardTitle>
            <CardDescription>共 {orders.length} 条订单记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>订单日期</TableHead>
                  <TableHead>交货日期</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            生成工单
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            导出PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
      </div>
    </MainLayout>
  );
}
