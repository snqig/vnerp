'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { Plus, Search, Edit, Trash2, Printer, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface Item {
  id: number;
  label_no: string;
  work_order_no: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  batch_no: string;
  qc_result: string;
  status: number;
  create_time?: string;
}

const LABEL_STATUS_CONFIG: Record<
  number,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { variant: 'outline' },
  2: { variant: 'default' },
  3: { variant: 'secondary' },
};



export default function ProductLabelPage() {
  // 翻译钩子
  const t = useTranslations('Production');
  const tc = useTranslations('Common');

  const exportColumns = [
    { key: 'label_no', header: t('labelNo') },
    { key: 'work_order_no', header: t('workOrderNo') },
    { key: 'material_code', header: t('materialCode') },
    { key: 'material_name', header: t('materialName') },
    { key: 'quantity', header: tc('quantity') },
    { key: 'batch_no', header: t('batchNo') },
    { key: 'qc_result', header: t('qcResult') },
    { key: 'status_label', header: tc('status') },
  ];

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [printItems, setPrintItems] = useState<Item[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<number, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        labelNo: searchNo,
        materialName: searchMaterial,
        status: searchStatus,
      });
      const res = await authFetch('/api/production/product-label?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [page, searchNo, searchMaterial, searchStatus]);

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
      setSelectedIds(new Set(list.map((i) => i.id)));
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/production/product-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/production/product-label', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '更新成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch('/api/production/product-label?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch (e) {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleBatchPrint = async () => {
    const items = list.filter((i) => selectedIds.has(i.id));
    if (items.length === 0) {
      toast({ title: '请先选择要打印的标签', variant: 'destructive' });
      return;
    }
    setPrintItems(items);
    const urls: Record<number, string> = {};
    for (const item of items) {
      try {
        const qrContent = `DCERP:LABEL:${item.label_no}:${item.batch_no || ''}:${Date.now()}`;
        urls[item.id] = await QRCode.toDataURL(qrContent, { width: 120, margin: 1 });
      } catch {
        urls[item.id] = '';
      }
    }
    setQrDataUrls(urls);
    setShowPrintDialog(true);
  };

  const handleSinglePrint = async (item: Item) => {
    setPrintItems([item]);
    const urls: Record<number, string> = {};
    try {
      const qrContent = `DCERP:LABEL:${item.label_no}:${item.batch_no || ''}:${Date.now()}`;
      urls[item.id] = await QRCode.toDataURL(qrContent, { width: 120, margin: 1 });
    } catch {
      urls[item.id] = '';
    }
    setQrDataUrls(urls);
    setShowPrintDialog(true);
  };

  const doPrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>成品标签打印</title>
      <style>
        body { margin: 10px; font-family: 'Microsoft YaHei', sans-serif; }
        .label-page { page-break-after: always; display: flex; flex-wrap: wrap; gap: 8px; }
        .label-card {
          border: 2px solid #000; border-radius: 4px; padding: 10px;
          width: 240px; height: 160px; display: flex; flex-direction: row; gap: 8px;
          box-sizing: border-box;
        }
        .label-info { flex: 1; font-size: 11px; line-height: 1.6; }
        .label-info .title { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
        .label-qr { display: flex; align-items: center; }
        .label-qr img { width: 90px; height: 90px; }
        @media print { .label-page { page-break-after: always; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      const printIds = printItems.map((i) => i.id);
      printIds.forEach((id) => handleStatusChange(id, 2));
    }, 500);
  };

  const getExportLabel = (status: number) => {
    const labels: Record<number, string> = {1: t('labelPendingPrint'), 2: t('labelPrinted'), 3: t('labelLabeled')};
    return labels[status] || tc('unknown');
  };
  const getExportData = () =>
    list.map((item) => ({
      ...item,
      status_label: getExportLabel(item.status),
    }));

  const handlePrint = () => printTable(getExportData(), exportColumns, '成品标签');
  const handleExportPDF = () =>
    exportTableToPDF(getExportData(), '成品标签', exportColumns, '成品标签');
  const handleExportXLS = () => exportTableToXLS(getExportData(), '成品标签', exportColumns);
  const handleExportWORD = () =>
    exportTableToWORD(getExportData(), '成品标签', exportColumns, '成品标签');

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('productLabelTitle')}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchByNo')}
                  className="pl-8 w-36 h-8 text-sm"
                  value={searchNo}
                  onChange={(e) => setSearchNo(e.target.value)}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchMaterial')}
                  className="pl-8 w-36 h-8 text-sm"
                  value={searchMaterial}
                  onChange={(e) => setSearchMaterial(e.target.value)}
                />
              </div>
              <Select value={searchStatus} onValueChange={setSearchStatus}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={t('statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  {Object.entries(LABEL_STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {t(k === '1' ? 'labelPendingPrint' : k === '2' ? 'labelPrinted' : 'labelLabeled')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}>
                {t('query')}
              </Button>
            </div>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={list.length}
              onSelectAll={toggleSelectAll}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={handlePrint}
              onExportPDF={handleExportPDF}
              onExportXLS={handleExportXLS}
              onExportWORD={handleExportWORD}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchPrint}
              disabled={selectedIds.size === 0}
            >
              <QrCode className="h-3 w-3 mr-1" />
              {t('printLabelCount', { count: selectedIds.size })}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('newLabel')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={list.length > 0 && selectedIds.size === list.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">{t('labelNo')}</TableHead>
                  <TableHead className="text-xs">{t('workOrderNo')}</TableHead>
                  <TableHead className="text-xs">{t('materialCode')}</TableHead>
                  <TableHead className="text-xs">{t('materialName')}</TableHead>
                  <TableHead className="text-xs">{tc('quantity')}</TableHead>
                  <TableHead className="text-xs">{t('batchNo')}</TableHead>
                  <TableHead className="text-xs">{t('qcResult')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = LABEL_STATUS_CONFIG[item.status] || LABEL_STATUS_CONFIG[1];
                  const labelStatusLabels: Record<number, string> = {1: t('labelPendingPrint'), 2: t('labelPrinted'), 3: t('labelLabeled')};
                  return (
                    <TableRow
                      key={item.id}
                      className={selectedIds.has(item.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.label_no}</TableCell>
                      <TableCell className="text-xs">{item.work_order_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.material_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {item.quantity}
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">{item.batch_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.qc_result || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {labelStatusLabels[item.status] || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => handleSinglePrint(item)}
                            title={t('printLabel')}
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleStatusChange(item.id, 3)}
                            >
                              {t('labelLabeled')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditItem(item);
                              setShowDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {tc('total', { count: total })} {selectedIds.size > 0 && t('selectedCount', { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem?.id ? t('editLabel') : t('newLabel')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('workOrderNo')}</Label>
                <Input
                  value={editItem.work_order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, work_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('materialCode')}</Label>
                <Input
                  value={editItem.material_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, material_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('materialName')}</Label>
                <Input
                  value={editItem.material_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, material_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  value={editItem.quantity || ''}
                  onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('unit')}</Label>
                <Input
                  value={editItem.unit || '张'}
                  onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('batchNo')}</Label>
                <Input
                  value={editItem.batch_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, batch_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('qcResult')}</Label>
                <Input
                  value={editItem.qc_result || ''}
                  onChange={(e) => setEditItem({ ...editItem, qc_result: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('printLabel')}</DialogTitle>
            </DialogHeader>
            <div ref={printRef} className="label-page flex flex-wrap gap-3">
              {printItems.map((item) => (
                <div
                  key={item.id}
                  className="label-card border-2 border-black rounded p-2 flex gap-2"
                  style={{ width: 260, minHeight: 150 }}
                >
                  <div className="flex-1 text-xs leading-relaxed">
                    <div className="text-sm font-bold mb-1">{item.material_name}</div>
                    <div>{t('labelNo')}: {item.label_no}</div>
                    <div>{t('workOrderNo')}: {item.work_order_no || '-'}</div>
                    <div>{t('materialCode')}: {item.material_code || '-'}</div>
                    <div>
                      {tc('quantity')}: {item.quantity} {item.unit}
                    </div>
                    <div>{t('batchNo')}: {item.batch_no || '-'}</div>
                    <div>{t('qcResult')}: {item.qc_result || '-'}</div>
                  </div>
                  <div className="flex items-center">
                    {qrDataUrls[item.id] && (
                      <img src={qrDataUrls[item.id]} alt="QR" style={{ width: 90, height: 90 }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={doPrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('print')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
