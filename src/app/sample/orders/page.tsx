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
import { Checkbox } from '@/components/ui/checkbox';
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
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/date-utils';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';

interface SampleOrder {
  id: number;
  order_no: string;
  notify_date: string;
  customer_name: string;
  product_name: string;
  material_no: string;
  version: string;
  size_spec: string;
  material_spec: string;
  quantity: number;
  customer_require_date: string;
  actual_delivery_date: string | null;
  delivery_status: string;
  remark: string;
  create_time: string;
  update_time: string;
}

const statusLabelMap: Record<string, string> = {
  pending: '待交付',
  delivered: '已交付',
  signed: '已签样',
  approved: '已通过',
  completed: '已完成',
  producing: '生产中',
};

export default function SampleOrdersPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SampleOrder | null>(null);
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 300);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState({
    notify_date: '',
    customer_name: '',
    product_name: '',
    material_no: '',
    version: 'A',
    size_spec: '',
    material_spec: '',
    quantity: '',
    customer_require_date: '',
    remark: '',
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') { setSortField(null); setSortOrder(null); }
    } else { setSortField(field); setSortOrder('asc'); }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedOrders = useMemo(() => {
    if (!sortField || !sortOrder) return orders;
    return [...orders].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortOrder]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        keyword: debouncedKeyword,
      });
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('deliveryStatus', selectedStatus);
      }
      if (selectedCustomer && selectedCustomer !== 'all') {
        params.append('customerName', selectedCustomer);
      }
      const response = await fetch(`/api/sample/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || (result.data || []).length,
          totalPages: result.pagination?.totalPages || 1,
        }));
      }
    } catch {
      toast({ title: '获取打样订单列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedKeyword, selectedStatus, selectedCustomer, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/sample/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity) || 0 }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: `打样订单 ${result.data.order_no} 已创建` });
        setIsCreateOpen(false);
        resetForm();
        fetchOrders();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingOrder) return;
    try {
      const response = await fetch('/api/sample/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingOrder.id, ...formData, quantity: parseInt(formData.quantity) || 0 }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: '更新成功' });
        setIsEditOpen(false);
        setEditingOrder(null);
        resetForm();
        fetchOrders();
      } else {
        toast({ title: result.message || '更新失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此打样订单吗？')) return;
    try {
      const response = await fetch(`/api/sample/orders?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchOrders();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch('/api/sample/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          delivery_status: status,
          actual_delivery_date: new Date().toISOString().split('T')[0],
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: `状态已更新为${statusLabelMap[status] || status}` });
        fetchOrders();
      } else {
        toast({ title: result.message || '状态更新失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '状态更新失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (order: SampleOrder) => {
    setEditingOrder(order);
    setFormData({
      notify_date: (order.notify_date || '').slice(0, 10),
      customer_name: order.customer_name,
      product_name: order.product_name,
      material_no: order.material_no,
      version: order.version,
      size_spec: order.size_spec,
      material_spec: order.material_spec,
      quantity: order.quantity.toString(),
      customer_require_date: (order.customer_require_date || '').slice(0, 10),
      remark: order.remark,
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      notify_date: '',
      customer_name: '',
      product_name: '',
      material_no: '',
      version: 'A',
      size_spec: '',
      material_spec: '',
      quantity: '',
      customer_require_date: '',
      remark: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />已签样</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-700"><FileText className="h-3 w-3 mr-1" />已交付</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />待交付</Badge>;
      default:
        return <Badge variant="secondary">{statusLabelMap[status] || status}</Badge>;
    }
  };

  const customers = Array.from(new Set(orders.map(o => o.customer_name)));

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedOrders.map(o => o.id)));
  };

  const exportColumns = [
    { key: 'notify_date', header: '通知日期' },
    { key: 'customer_name', header: '客户' },
    { key: 'product_name', header: '品名' },
    { key: 'material_no', header: '料号' },
    { key: 'version', header: '版本' },
    { key: 'size_spec', header: '尺寸' },
    { key: 'quantity', header: '数量' },
    { key: 'customer_require_date', header: '需求日期' },
    { key: 'delivery_status', header: '状态' },
  ];
  const getExportData = () => sortedOrders.map((s, i) => ({
    序号: i + 1,
    通知日期: formatDate(s.notify_date),
    客户: s.customer_name,
    品名: s.product_name,
    料号: s.material_no,
    版本: s.version,
    尺寸: s.size_spec,
    数量: s.quantity,
    需求日期: formatDate(s.customer_require_date),
    状态: statusLabelMap[s.delivery_status] || s.delivery_status,
  }));

  const handlePrint = () => {
    const items = selectedIds.size > 0 ? sortedOrders.filter(o => selectedIds.has(o.id)) : sortedOrders;
    if (items.length === 0) { toast({ title: '没有可打印的数据', variant: 'destructive' }); return; }
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>打样订单列表</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; margin: 20px; }
        h2 { text-align: center; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        .right { text-align: right; }
      </style></head><body>
      <h2>打样订单列表</h2>
      <table><thead><tr>
        <th>序号</th><th>通知日期</th><th>客户</th><th>品名</th><th>料号</th><th>版本</th><th>尺寸</th><th>数量</th><th>需求日期</th><th>状态</th>
      </tr></thead><tbody>`);
    items.forEach((o, i) => {
      printWindow.document.write(`<tr>
        <td>${i + 1}</td><td>${formatDate(o.notify_date)}</td><td>${o.customer_name}</td>
        <td>${o.product_name}</td><td>${o.material_no}</td><td>${o.version}</td>
        <td>${o.size_spec || '-'}</td><td>${o.quantity}</td><td>${formatDate(o.customer_require_date)}</td>
        <td>${statusLabelMap[o.delivery_status] || o.delivery_status}</td>
      </tr>`);
    });
    printWindow.document.write(`</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const sortableHeader = (field: string, label: string) => (
    <th
      className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">{label}{getSortIcon(field)}</span>
    </th>
  );

  const formFields = (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label>通知打样日期 <span className="text-red-500">*</span></Label>
        <Input type="date" value={formData.notify_date} onChange={(e) => handleInputChange('notify_date', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>客户名称 <span className="text-red-500">*</span></Label>
        <Input placeholder="客户名称" value={formData.customer_name} onChange={(e) => handleInputChange('customer_name', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>品名 <span className="text-red-500">*</span></Label>
        <Input placeholder="品名" value={formData.product_name} onChange={(e) => handleInputChange('product_name', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>料号 <span className="text-red-500">*</span></Label>
        <Input placeholder="料号" value={formData.material_no} onChange={(e) => handleInputChange('material_no', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>版本</Label>
        <Input placeholder="版本" value={formData.version} onChange={(e) => handleInputChange('version', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>数量</Label>
        <Input type="number" placeholder="数量" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>尺寸规格</Label>
        <Input placeholder="尺寸规格" value={formData.size_spec} onChange={(e) => handleInputChange('size_spec', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>客户需求日期</Label>
        <Input type="date" value={formData.customer_require_date} onChange={(e) => handleInputChange('customer_require_date', e.target.value)} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>材料规格</Label>
        <Input placeholder="材料规格" value={formData.material_spec} onChange={(e) => handleInputChange('material_spec', e.target.value)} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>备注</Label>
        <Input placeholder="备注" value={formData.remark} onChange={(e) => handleInputChange('remark', e.target.value)} />
      </div>
    </div>
  );

  return (
    <MainLayout title="打样订单管理">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号、品名、料号..."
                    className="pl-10"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="客户筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部客户</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待交付</SelectItem>
                    <SelectItem value="delivered">已交付</SelectItem>
                    <SelectItem value="signed">已签样</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={sortedOrders.length}
                  onSelectAll={toggleSelectAll}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={handlePrint}
                  onExportPDF={() => exportTableToPDF(getExportData(), '打样订单列表', exportColumns, '打样订单列表')}
                  onExportXLS={() => exportTableToXLS(getExportData(), '打样订单列表', exportColumns)}
                  onExportWORD={() => exportTableToWORD(getExportData(), '打样订单列表', exportColumns, '打样订单列表')}
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新建打样单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
                    <DialogHeader>
                      <DialogTitle>新建打样订单</DialogTitle>
                      <DialogDescription>填写打样订单信息</DialogDescription>
                    </DialogHeader>
                    {formFields}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>取消</Button>
                      <Button onClick={handleCreate}>保存</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>打样订单列表</CardTitle>
            <CardDescription>共 {pagination.total} 个打样订单{selectedIds.size > 0 ? `，已选 ${selectedIds.size} 项` : ''}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">暂无打样订单数据</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === sortedOrders.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      {sortableHeader('order_no', '序号')}
                      {sortableHeader('notify_date', '通知日期')}
                      {sortableHeader('customer_name', '客户')}
                      {sortableHeader('product_name', '品名')}
                      {sortableHeader('material_no', '料号')}
                      {sortableHeader('version', '版本')}
                      {sortableHeader('size_spec', '尺寸')}
                      {sortableHeader('quantity', '数量')}
                      {sortableHeader('customer_require_date', '需求日期')}
                      <th className="h-12 px-4 text-left align-middle font-medium">状态</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((order, index) => (
                      <tr key={order.id} className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-4">
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                        </td>
                        <td className="p-4 font-mono text-sm">{order.order_no}</td>
                        <td className="p-4">{formatDate(order.notify_date)}</td>
                        <td className="p-4">{order.customer_name}</td>
                        <td className="p-4 font-medium">{order.product_name}</td>
                        <td className="p-4 font-mono text-xs">{order.material_no}</td>
                        <td className="p-4">{order.version}</td>
                        <td className="p-4 text-xs">{order.size_spec || '-'}</td>
                        <td className="p-4">{order.quantity}</td>
                        <td className="p-4">{formatDate(order.customer_require_date)}</td>
                        <td className="p-4">{getStatusBadge(order.delivery_status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {order.delivery_status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>
                                  <FileText className="h-4 w-4 mr-2" />标记已交付
                                </DropdownMenuItem>
                              )}
                              {order.delivery_status === 'delivered' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'signed')}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />标记已签样
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                <Edit className="h-4 w-4 mr-2" />编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(order.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>编辑打样订单</DialogTitle>
            <DialogDescription>修改打样订单信息</DialogDescription>
          </DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingOrder(null); resetForm(); }}>取消</Button>
            <Button onClick={handleUpdate}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
