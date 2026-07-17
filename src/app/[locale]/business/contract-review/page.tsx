'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { Plus, Search, Edit, Trash2, Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface ContractReviewRecord {
  id?: number;
  review_no: string;
  order_id?: number;
  order_no: string;
  customer_id?: number;
  customer_name: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  quantity: number;
  amount: number;
  delivery_date: string;
  sample_status: string;
  quality_requirement: string;
  production_capacity: string;
  material_availability: string;
  engineering_feasibility: string;
  biz_opinion: string;
  eng_opinion: string;
  quality_opinion: string;
  prod_opinion: string;
  purchase_opinion: string;
  review_date: string;
  status: number;
  remark: string;
  create_time: string;
}

export default function ContractReviewPage() {
  const t = useTranslations('Business');
  const tc = useTranslations('Common');

  const sampleStatusMap: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    pending: { label: t('samplePending'), variant: 'outline' },
    sampling: { label: t('sampleSampling'), variant: 'secondary' },
    approved: { label: t('sampleApproved'), variant: 'default' },
    rejected: { label: t('sampleRejected'), variant: 'destructive' },
    not_required: { label: t('sampleNotRequired'), variant: 'secondary' },
  };
  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('pendingReview'), variant: 'outline' },
    2: { label: t('reviewing'), variant: 'secondary' },
    3: { label: t('approved'), variant: 'default' },
    4: { label: t('rejected'), variant: 'destructive' },
  };

  const exportColumns = [
    { key: 'review_no', header: t('reviewNo') },
    { key: 'order_no', header: t('orderNo') },
    { key: 'customer_name', header: t('customerName') },
    { key: 'product_name', header: t('productName') },
    { key: 'quantity', header: t('quantity') },
    { key: 'amount', header: t('amount') },
    { key: 'delivery_date', header: t('deliveryDate') },
    { key: 'sample_status_label', header: t('sampleStatus') },
    { key: 'status_label', header: t('reviewStatus') },
  ];

  const { toast } = useToast();
  const [list, setList] = useState<ContractReviewRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ContractReviewRecord>>({});
  const [activeReviewTab, setActiveReviewTab] = useState('biz');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        customerName: searchCustomer,
        productName: searchProduct,
        status: searchStatus,
      });
      const res = await authFetch('/api/business/contract-review?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  }, [page, searchCustomer, searchProduct, searchStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length && list.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((i) => i.id!)));
    }
  };

  const getExportData = () =>
    list.map((item) => ({
      ...item,
      sample_status_label: sampleStatusMap[item.sample_status]?.label || tc('unknown'),
      status_label: statusMap[item.status]?.label || tc('unknown'),
    }));

  const handlePrint = () => {
    printTable(getExportData(), exportColumns, '合同评审管理');
  };

  const handleExportPDF = () => {
    exportTableToPDF(getExportData(), '合同评审管理', exportColumns, '合同评审管理');
  };

  const handleExportXLS = () => {
    exportTableToXLS(getExportData(), '合同评审管理', exportColumns);
  };

  const handleExportWORD = () => {
    exportTableToWORD(getExportData(), '合同评审管理', exportColumns, '合同评审管理');
  };

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/business/contract-review', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleSaveReview = async () => {
    try {
      const res = await authFetch('/api/business/contract-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '评审意见保存成功' });
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此评审记录？')) return;
    try {
      const res = await authFetch('/api/business/contract-review?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const openReview = (item: ContractReviewRecord) => {
    setEditItem(item);
    setActiveReviewTab('biz');
    setShowReviewDialog(true);
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await authFetch('/api/upload/contract', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        setAttachments((prev) => [...prev, { name: uploadFile.name, url: result.data.url }]);
        setUploadFile(null);
        toast({ title: '文件上传成功' });
      } else {
        toast({ title: '上传失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '上传失败', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <MainLayout title="合同评审管理">
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索客户名称"
                    className="pl-8 w-48"
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tc('searchProductName')}
                    className="pl-8 w-48"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                </div>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  {tc('query')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <GlobalExportToolbar
                  filename="合同评审管理"
                  title="合同评审管理"
                  columns={[
                    { key: 'review_no', label: t('reviewNo'), width: 18 },
                    { key: 'order_no', label: t('orderNo'), width: 15 },
                    { key: 'customer_name', label: t('customerName'), width: 18 },
                    { key: 'product_name', label: t('productName'), width: 20 },
                    { key: 'quantity', label: t('quantity'), width: 10 },
                    { key: 'amount', label: t('amount'), width: 12 },
                    { key: 'delivery_date', label: t('deliveryDate'), width: 12 },
                    {
                      key: 'sample_status',
                      label: t('sampleStatus'),
                      width: 12,
                      formatter: (v) => sampleStatusMap[v]?.label || tc('unknown'),
                    },
                    {
                      key: 'status',
                      label: t('reviewStatus'),
                      width: 12,
                      formatter: (v) => statusMap[v]?.label || tc('unknown'),
                    },
                  ]}
                  data={
                    selectedIds.size > 0 ? list.filter((i) => i.id && selectedIds.has(i.id)) : list
                  }
                />
                <Button
                  onClick={() => {
                    setEditItem({ sample_status: 'pending' });
                    setShowDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newReview')}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={list.length > 0 && selectedIds.size === list.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('reviewNo')}</TableHead>
                  <TableHead>{tc('orderNo')}</TableHead>
                  <TableHead>{tc('customerName')}</TableHead>
                  <TableHead>{tc('productName')}</TableHead>
                  <TableHead>{tc('quantity')}</TableHead>
                  <TableHead>{tc('amount')}</TableHead>
                  <TableHead>{t('deliveryDate')}</TableHead>
                  <TableHead>{t('sampleStatus')}</TableHead>
                  <TableHead>{t('reviewStatus')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id} className={selectedIds.has(item.id!) ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id!)}
                        onCheckedChange={() => toggleSelect(item.id!)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.review_no}</TableCell>
                    <TableCell>{item.order_no || '-'}</TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.amount ? '¥' + Number(item.amount).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>{item.delivery_date?.substring(0, 10) || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sampleStatusMap[item.sample_status]?.variant || 'outline'}>
                        {sampleStatusMap[item.sample_status]?.label || tc('unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                        {statusMap[item.status]?.label || tc('unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openReview(item)}>
                          评审
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                共{total}条{selectedIds.size > 0 && `，已选 ${selectedIds.size} 条`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑评审' : '新建评审'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>订单号</Label>
                <Input
                  value={editItem.order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>客户名称 *</Label>
                <Input
                  value={editItem.customer_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>产品编码</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('productNameLabel')}</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  value={editItem.quantity || 0}
                  onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('amount')}</Label>
                <Input
                  type="number"
                  value={editItem.amount || 0}
                  onChange={(e) => setEditItem({ ...editItem, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>交货日期</Label>
                <Input
                  type="date"
                  value={editItem.delivery_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, delivery_date: e.target.value })}
                />
              </div>
              <div>
                <Label>样品状态</Label>
                <Select
                  value={editItem.sample_status || 'pending'}
                  onValueChange={(v) => setEditItem({ ...editItem, sample_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sampleStatusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>质量要求</Label>
                <Textarea
                  rows={2}
                  value={editItem.quality_requirement || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, quality_requirement: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  rows={2}
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>
                {tc('reviewTitlePrefix')}
                {editItem.review_no}
              </DialogTitle>
            </DialogHeader>
            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">客户：</span>
                {editItem.customer_name}
              </div>
              <div>
                <span className="text-muted-foreground">{tc('productNameLabel')}</span>
                {editItem.product_name}
              </div>
              <div>
                <span className="text-muted-foreground">数量：</span>
                {editItem.quantity}
              </div>
            </div>
            <Tabs value={activeReviewTab} onValueChange={setActiveReviewTab}>
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="biz">业务部</TabsTrigger>
                <TabsTrigger value="eng">工程技术部</TabsTrigger>
                <TabsTrigger value="quality">品质部</TabsTrigger>
                <TabsTrigger value="prod">生产部</TabsTrigger>
                <TabsTrigger value="purchase">采购部</TabsTrigger>
              </TabsList>
              <TabsContent value="biz" className="space-y-4 mt-4">
                <h3 className="font-semibold">{tc('bizReviewOpinionTitle')}</h3>
                <div>
                  <Label>{tc('reviewOpinionLabel')}</Label>
                  <Textarea
                    rows={4}
                    value={editItem.biz_opinion || ''}
                    onChange={(e) => setEditItem({ ...editItem, biz_opinion: e.target.value })}
                    placeholder="业务部对合同条款、交期、价格等方面的评审意见"
                  />
                </div>
              </TabsContent>
              <TabsContent value="eng" className="space-y-4 mt-4">
                <h3 className="font-semibold">工程技术部评审意见</h3>
                <div>
                  <Label>{tc('engineeringFeasibilityLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.engineering_feasibility || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, engineering_feasibility: e.target.value })
                    }
                    placeholder="工艺可行性、打样状态、技术难点等评估"
                  />
                </div>
                <div>
                  <Label>{tc('reviewOpinionLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.eng_opinion || ''}
                    onChange={(e) => setEditItem({ ...editItem, eng_opinion: e.target.value })}
                    placeholder="工程技术部评审意见"
                  />
                </div>
              </TabsContent>
              <TabsContent value="quality" className="space-y-4 mt-4">
                <h3 className="font-semibold">品质部评审意见</h3>
                <div>
                  <Label>{tc('qualityRequirementLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.quality_requirement || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, quality_requirement: e.target.value })
                    }
                    placeholder="客户质量要求是否可达成、检验标准等评估"
                  />
                </div>
                <div>
                  <Label>{tc('reviewOpinionLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.quality_opinion || ''}
                    onChange={(e) => setEditItem({ ...editItem, quality_opinion: e.target.value })}
                    placeholder="品质部评审意见"
                  />
                </div>
              </TabsContent>
              <TabsContent value="prod" className="space-y-4 mt-4">
                <h3 className="font-semibold">生产部评审意见</h3>
                <div>
                  <Label>产能评估</Label>
                  <Textarea
                    rows={3}
                    value={editItem.production_capacity || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, production_capacity: e.target.value })
                    }
                    placeholder="产能是否满足、排产计划等评估"
                  />
                </div>
                <div>
                  <Label>{tc('reviewOpinionLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.prod_opinion || ''}
                    onChange={(e) => setEditItem({ ...editItem, prod_opinion: e.target.value })}
                    placeholder="生产部评审意见"
                  />
                </div>
              </TabsContent>
              <TabsContent value="purchase" className="space-y-4 mt-4">
                <h3 className="font-semibold">采购部评审意见</h3>
                <div>
                  <Label>{tc('materialAvailabilityLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.material_availability || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, material_availability: e.target.value })
                    }
                    placeholder="物料供应能力、交期等评估"
                  />
                </div>
                <div>
                  <Label>{tc('reviewOpinionLabel')}</Label>
                  <Textarea
                    rows={3}
                    value={editItem.purchase_opinion || ''}
                    onChange={(e) => setEditItem({ ...editItem, purchase_opinion: e.target.value })}
                    placeholder="采购部评审意见"
                  />
                </div>
              </TabsContent>
            </Tabs>
            <div className="border-t pt-4 mt-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                附件上传
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                  }}
                  className="max-w-xs"
                />
                <Button size="sm" disabled={!uploadFile || uploading} onClick={handleFileUpload}>
                  {uploading ? '上传中...' : tc('upload')}
                </Button>
                {uploadFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {uploadFile.name}
                  </span>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {att.name}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                关闭
              </Button>
              <Button onClick={handleSaveReview}>{tc('saveReview')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
