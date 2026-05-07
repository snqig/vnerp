'use client';

import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';
import { formatDate } from '@/lib/date-utils';

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
  actual_delivery_date: string;
  delivery_status: string;
  remark: string;
  create_time: string;
  update_time: string;
}

const statusLabelMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  completed: '已完成',
  producing: '生产中',
  delivered: '已交付',
  signed: '已签收',
};

const emptyForm = {
  notify_date: '',
  customer_name: '',
  product_name: '',
  material_no: '',
  version: 'A',
  size_spec: '',
  material_spec: '',
  quantity: 0,
  customer_require_date: '',
  remark: '',
};

export default function SampleManagementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<SampleOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<SampleOrder | null>(null);

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedList = [...list].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal, 'zh-CN');
    } else {
      cmp = (aVal as number) - (bVal as number);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待审批', className: 'bg-yellow-100 text-yellow-700' },
      approved: { label: '已通过', className: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
      completed: { label: '已完成', className: 'bg-blue-100 text-blue-700' },
      producing: { label: '生产中', className: 'bg-purple-100 text-purple-700' },
      delivered: { label: '已交付', className: 'bg-cyan-100 text-cyan-700' },
      signed: { label: '已签收', className: 'bg-emerald-100 text-emerald-700' },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        keyword: debouncedKeyword,
      });
      if (statusFilter !== 'all') params.set('deliveryStatus', statusFilter);
      const res = await fetch(`/api/sample/orders?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data || []);
        setTotal(result.pagination?.total || (result.data || []).length);
      }
    } catch (e) {
      console.error('获取样品列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedKeyword, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = (item: SampleOrder) => {
    setDetailItem(item);
    setShowDetailDialog(true);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowFormDialog(true);
  };

  const handleOpenEdit = (item: SampleOrder) => {
    setEditId(item.id);
    setForm({
      notify_date: (item.notify_date || '').slice(0, 10),
      customer_name: item.customer_name || '',
      product_name: item.product_name || '',
      material_no: item.material_no || '',
      version: item.version || 'A',
      size_spec: item.size_spec || '',
      material_spec: item.material_spec || '',
      quantity: item.quantity || 0,
      customer_require_date: (item.customer_require_date || '').slice(0, 10),
      remark: item.remark || '',
    });
    setShowFormDialog(true);
  };

  const handleSave = async () => {
    if (!form.notify_date || !form.customer_name || !form.product_name || !form.material_no) {
      toast({ title: '请填写必填字段（通知日期、客户、产品名称、物料编号）', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = '/api/sample/orders';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editId ? '更新成功' : '创建成功' });
        setShowFormDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个样品订单吗？')) return;
    try {
      const res = await fetch(`/api/sample/orders?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const exportColumns = [
    { key: 'order_no', header: '样品编号' },
    { key: 'product_name', header: '产品名称' },
    { key: 'customer_name', header: '客户' },
    { key: 'notify_date', header: '通知日期' },
    { key: 'customer_require_date', header: '要求交付日期' },
    { key: 'delivery_status', header: '状态' },
  ];
  const getExportData = () => sortedList.map(s => ({
    order_no: s.order_no,
    product_name: s.product_name,
    customer_name: s.customer_name,
    notify_date: formatDate(s.notify_date),
    customer_require_date: formatDate(s.customer_require_date),
    delivery_status: statusLabelMap[s.delivery_status] || s.delivery_status,
  }));

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedList.map(s => s.id)));
  };

  return (
    <MainLayout title="样品管理">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索样品编号、产品名称、物料编号..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待审批</SelectItem>
                    <SelectItem value="approved">已通过</SelectItem>
                    <SelectItem value="producing">生产中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="delivered">已交付</SelectItem>
                    <SelectItem value="signed">已签收</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={list.length}
                  onSelectAll={toggleSelectAll}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={() => printTable(getExportData(), exportColumns, '样品列表')}
                  onExportPDF={() => exportTableToPDF(getExportData(), '样品列表', exportColumns, '样品列表')}
                  onExportXLS={() => exportTableToXLS(getExportData(), '样品列表', exportColumns)}
                  onExportWORD={() => exportTableToWORD(getExportData(), '样品列表', exportColumns, '样品列表')}
                />
                <Button onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增样品
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>样品列表{total > 0 ? ` (${total})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">暂无样品数据</div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === sortedList.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium w-[60px]">序号</th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('order_no')}>
                        <span className="inline-flex items-center">样品编号{getSortIcon('order_no')}</span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('product_name')}>
                        <span className="inline-flex items-center">产品名称{getSortIcon('product_name')}</span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('customer_name')}>
                        <span className="inline-flex items-center">客户{getSortIcon('customer_name')}</span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium">规格</th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('quantity')}>
                        <span className="inline-flex items-center">数量{getSortIcon('quantity')}</span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('notify_date')}>
                        <span className="inline-flex items-center">通知日期{getSortIcon('notify_date')}</span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium">要求交付日期</th>
                      <th className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('delivery_status')}>
                        <span className="inline-flex items-center">状态{getSortIcon('delivery_status')}</span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((item, index) => (
                      <tr key={item.id} className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-4">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
                        <td className="p-4 font-mono text-sm">{item.order_no}</td>
                        <td className="p-4 font-medium">{item.product_name}</td>
                        <td className="p-4">{item.customer_name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{item.size_spec || '-'}</td>
                        <td className="p-4">{item.quantity || 0}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(item.notify_date)}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(item.customer_require_date)}</td>
                        <td className="p-4">{getStatusBadge(item.delivery_status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
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
            {total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  共 {total} 条，第 {page}/{Math.ceil(total / pageSize)} 页
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>样品详情 - {detailItem?.order_no}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><Label className="text-muted-foreground">样品编号</Label><p className="font-mono">{detailItem.order_no}</p></div>
              <div><Label className="text-muted-foreground">客户名称</Label><p>{detailItem.customer_name}</p></div>
              <div><Label className="text-muted-foreground">产品名称</Label><p className="font-medium">{detailItem.product_name}</p></div>
              <div><Label className="text-muted-foreground">物料编号</Label><p className="font-mono">{detailItem.material_no}</p></div>
              <div><Label className="text-muted-foreground">版本</Label><p>{detailItem.version || '-'}</p></div>
              <div><Label className="text-muted-foreground">规格</Label><p>{detailItem.size_spec || '-'}</p></div>
              <div><Label className="text-muted-foreground">材料规格</Label><p>{detailItem.material_spec || '-'}</p></div>
              <div><Label className="text-muted-foreground">数量</Label><p>{detailItem.quantity || 0}</p></div>
              <div><Label className="text-muted-foreground">通知日期</Label><p>{formatDate(detailItem.notify_date)}</p></div>
              <div><Label className="text-muted-foreground">要求交付日期</Label><p>{formatDate(detailItem.customer_require_date)}</p></div>
              <div><Label className="text-muted-foreground">实际交付日期</Label><p>{formatDate(detailItem.actual_delivery_date) || '-'}</p></div>
              <div><Label className="text-muted-foreground">状态</Label><p>{getStatusBadge(detailItem.delivery_status)}</p></div>
              <div className="col-span-2"><Label className="text-muted-foreground">备注</Label><p>{detailItem.remark || '-'}</p></div>
              <div><Label className="text-muted-foreground">创建时间</Label><p className="text-sm text-muted-foreground">{formatDate(detailItem.create_time)}</p></div>
              <div><Label className="text-muted-foreground">更新时间</Label><p className="text-sm text-muted-foreground">{formatDate(detailItem.update_time)}</p></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? '编辑样品订单' : '新增样品订单'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>通知日期 <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.notify_date} onChange={e => setForm(f => ({ ...f, notify_date: e.target.value }))} />
            </div>
            <div>
              <Label>客户名称 <span className="text-red-500">*</span></Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="输入客户名称" />
            </div>
            <div>
              <Label>产品名称 <span className="text-red-500">*</span></Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="输入产品名称" />
            </div>
            <div>
              <Label>物料编号 <span className="text-red-500">*</span></Label>
              <Input value={form.material_no} onChange={e => setForm(f => ({ ...f, material_no: e.target.value }))} placeholder="输入物料编号" />
            </div>
            <div>
              <Label>版本</Label>
              <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="如 A、B、C" />
            </div>
            <div>
              <Label>规格</Label>
              <Input value={form.size_spec} onChange={e => setForm(f => ({ ...f, size_spec: e.target.value }))} placeholder="如 150×80mm" />
            </div>
            <div>
              <Label>材料规格</Label>
              <Input value={form.material_spec} onChange={e => setForm(f => ({ ...f, material_spec: e.target.value }))} placeholder="如 PET材料" />
            </div>
            <div>
              <Label>数量</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>要求交付日期</Label>
              <Input type="date" value={form.customer_require_date} onChange={e => setForm(f => ({ ...f, customer_require_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>备注</Label>
              <Input value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} placeholder="输入备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
