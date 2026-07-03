'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Search,
  Edit,
  Trash2,
  QrCode,
  ClipboardList,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';

interface InventoryCheck {
  id: number;
  check_no: string;
  type: number;
  warehouse_id: number;
  status: number;
  start_time: string | null;
  end_time: string | null;
  checker_id: number | null;
  approver_id: number | null;
  total_items: number;
  diff_items: number;
  diff_amount: number;
  remark: string | null;
  create_time: string;
  update_time: string;
  warehouse_name?: string;
  checker_name?: string;
  approver_name?: string;
  type_name?: string;
  status_name?: string;
}

interface InventoryCheckItem {
  id: number;
  check_id: number;
  material_id: number;
  qr_code: string | null;
  batch_no: string | null;
  warehouse_location: string | null;
  split_flag: number;
  parent_qr_code: string | null;
  book_quantity: number;
  actual_quantity: number;
  difference: number;
  difference_reason: string | null;
  status: number;
  material_name?: string;
  unit?: string;
}

const TYPE_MAP: Record<number, string> = {
  1: '定期盘点',
  2: '不定期盘点',
  3: '循环盘点',
  4: '抽盘',
};

const SPLIT_FLAG_MAP: Record<number, string> = {
  0: '整料',
  1: '小料',
  2: '余料',
};

export default function StocktakingPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const STATUS_MAP: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    0: { label: tc('draft'), variant: 'outline' },
    1: { label: t('inProgress'), variant: 'default' },
    2: { label: tc('pending'), variant: 'secondary' },
    3: { label: t('completed'), variant: 'default' },
    4: { label: t('cancelled'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<InventoryCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InventoryCheck>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showScanDialog, setShowScanDialog] = useState(false);
  const [currentCheckId, setCurrentCheckId] = useState<number | null>(null);
  const [scanQrCode, setScanQrCode] = useState('');
  const [scanQuantity, setScanQuantity] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItems, setDetailItems] = useState<InventoryCheckItem[]>([]);

  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const exportColumns = [
    { key: 'check_no', header: t('checkNo') },
    { key: 'warehouse_name', header: t('warehouse') },
    { key: 'type_name', header: t('checkType') },
    { key: 'total_items', header: t('checkItems') },
    { key: 'diff_items', header: t('diffItems') },
    { key: 'diff_amount', header: t('diffAmount') },
    { key: 'status_name', header: tc('status') },
  ];

  const getExportData = () =>
    list.map((item) => ({
      check_no: item.check_no,
      warehouse_name: item.warehouse_name || '-',
      type_name: TYPE_MAP[item.type] || '-',
      total_items: item.total_items,
      diff_items: item.diff_items,
      diff_amount: item.diff_amount,
      status_name: STATUS_MAP[item.status]?.label || '-',
    }));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', checkNo: searchNo });
      const res = await authFetch('/api/warehouse/stocktaking?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=active&all=true');
      const result = await res.json();
      if (result.success) {
        setWarehouses(result.data?.map((w: any) => ({ id: w.id, name: w.name })) || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/warehouse/stocktaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editItem.type || 1,
          warehouse_id: editItem.warehouse_id,
          checker_id: editItem.checker_id,
          remark: editItem.remark,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: t('checkOrderGenerated'),
          description: t('checkOrderGeneratedDesc', { count: result.data.item_count }),
        });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string, extraData?: any) => {
    try {
      const body: any = { id, action };
      if (extraData) Object.assign(body, extraData);

      const res = await authFetch('/api/warehouse/stocktaking', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: tc('success') });
        fetchData();
        setShowApproveDialog(false);
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/warehouse/stocktaking?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('checkDeleteSuccess') });
        fetchData();
      } else {
        toast({ title: t('checkDeleteFailed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: t('checkDeleteFailed'), variant: 'destructive' });
    }
  };

  const openScanDialog = (check: InventoryCheck) => {
    setCurrentCheckId(check.id);
    setScanQrCode('');
    setScanQuantity('');
    setScanResult(null);
    setShowScanDialog(true);
  };

  const executeScan = async () => {
    if (!currentCheckId || !scanQrCode || !scanQuantity) {
      toast({ title: t('fillScanInfo'), variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${currentCheckId}/scan`, {
        method: 'POST',
        body: JSON.stringify({
          qr_code: scanQrCode,
          actual_quantity: Number(scanQuantity),
        }),
      });
      const result = await res.json();

      if (result.success) {
        setScanResult(result.data);
        toast({ title: t('scanCheckSuccess') });
        setScanQrCode('');
        setScanQuantity('');
      } else {
        toast({ title: t('scanCheckFailed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: t('scanCheckFailed'), variant: 'destructive' });
    }
  };

  const openDetailDialog = async (check: InventoryCheck) => {
    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${check.id}/items`);
      const result = await res.json();
      if (result.success) {
        const detailitemsList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setDetailItems(detailitemsList);
        setShowDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('stocktaking')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc("searchOrderNo")}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={list.length}
              onSelectAll={() => setSelectedIds(new Set(list.map((i) => i.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={() => printTable(getExportData(), exportColumns, t('stocktaking'))}
              onExportPDF={() =>
                exportTableToPDF(getExportData(), t('stocktaking'), exportColumns, t('stocktaking'))
              }
              onExportXLS={() => exportTableToXLS(getExportData(), t('stocktaking'), exportColumns)}
              onExportWORD={() =>
                exportTableToWORD(getExportData(), t('stocktaking'), exportColumns, t('stocktaking'))
              }
            />
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addStocktaking')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === list.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(list.map((i) => i.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-xs">{t('checkNo')}</TableHead>
                  <TableHead className="text-xs">{tc("warehouse")}</TableHead>
                  <TableHead className="text-xs">{tc("type")}</TableHead>
                  <TableHead className="text-xs">{t('checkItems')}</TableHead>
                  <TableHead className="text-xs">{t('diffItems')}</TableHead>
                  <TableHead className="text-xs">{t('diffAmount')}</TableHead>
                  <TableHead className="text-xs">{tc("status")}</TableHead>
                  <TableHead className="text-xs">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = STATUS_MAP[item.status] || STATUS_MAP[0];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds);
                            if (checked) next.add(item.id);
                            else next.delete(item.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.check_no}</TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{TYPE_MAP[item.type] || '-'}</TableCell>
                      <TableCell className="text-xs text-center">{item.total_items}</TableCell>
                      <TableCell className="text-xs text-center">{item.diff_items}</TableCell>
                      <TableCell className="text-xs text-center font-mono">
                        ¥{item.diff_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openScanDialog(item)}
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              {t('scan')}
                            </Button>
                          )}
                          {(item.status === 0 || item.status === 1) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAction(item.id, 'cancel')}
                            >
                              {tc('cancel')}
                            </Button>
                          )}
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAction(item.id, 'submit')}
                            >
                              {tc('submit')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => setShowApproveDialog(true)}
                            >
                              {tc('approve')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => openDetailDialog(item)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
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
                          {[0, 4].includes(item.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {t('noStocktakingRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t('totalRecordsCount', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('previousPage')}
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
              <DialogTitle>{t('addStocktaking')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  {t('warehouse')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(editItem.warehouse_id || '')}
                  onValueChange={(v) => setEditItem({ ...editItem, warehouse_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('checkType')}</Label>
                <Select
                  value={String(editItem.type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('periodic')}</SelectItem>
                    <SelectItem value="2">{t('irregular')}</SelectItem>
                    <SelectItem value="3">{t('cyclic')}</SelectItem>
                    <SelectItem value="4">{t('spotCheck')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('checker')}</Label>
                <UserSelect
                  value={editItem.checker_id ? String(editItem.checker_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, checker_id: Number(v) })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc("remark")}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{t('generateCheckOrder')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('scanCheckTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>
                  {t('scanCheckQrCode')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={scanQrCode}
                  onChange={(e) => setScanQrCode(e.target.value)}
                  placeholder={tc("scanOrEnterQrCode")}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>
                  {t('scanCheckQuantity')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={scanQuantity}
                  onChange={(e) => setScanQuantity(e.target.value)}
                  placeholder={t('scanCheckQtyPlaceholder')}
                />
              </div>
              {scanResult && (
                <div className="border rounded p-3 bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('materialNameLabel')}:</span>
                      {scanResult.material_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('batchNoLabel')}:</span>
                      {scanResult.batch_no || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('type')}:</span>
                      {SPLIT_FLAG_MAP[scanResult.split_flag] || t('whole')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('locationLabel')}:</span>
                      {scanResult.warehouse_location || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('bookQtyLabel')}:</span>
                      {scanResult.book_quantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('scanCheckQuantity')}:</span>
                      {scanResult.actual_quantity}
                    </div>
                    <div
                      className={`col-span-2 font-bold ${scanResult.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {t('diffLabel')}:{scanResult.difference > 0 ? '+' : ''}
                      {scanResult.difference}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScanDialog(false)}>
                {tc('close')}
              </Button>
              <Button onClick={executeScan}>
                <QrCode className="h-4 w-4 mr-1" />
                {t('confirmCheck')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('checkDetail')}</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('qrCodeCol')}</TableHead>
                  <TableHead>{t('materialNameCol')}</TableHead>
                  <TableHead>{tc("type")}</TableHead>
                  <TableHead>{t('bookQtyCol')}</TableHead>
                  <TableHead>{t('actualQtyCol')}</TableHead>
                  <TableHead>{t('diffQtyCol')}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.qr_code || '-'}</TableCell>
                    <TableCell className="text-xs">{item.material_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {SPLIT_FLAG_MAP[item.split_flag] || t('whole')}
                    </TableCell>
                    <TableCell className="text-xs text-center">{item.book_quantity}</TableCell>
                    <TableCell className="text-xs text-center">
                      {item.actual_quantity || '-'}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-center font-bold ${item.difference !== 0 ? 'text-red-600' : ''}`}
                    >
                      {item.difference > 0 ? '+' : ''}
                      {item.difference}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {item.status === 0 ? t('unchecked') : item.status === 1 ? t('checked') : t('adjusted')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('approveCheckTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc("approver")}</Label>
                <UserSelect value="" onChange={(v) => {}} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleAction(list.find((i) => i.status === 2)?.id || 0, 'approve', {
                      approver_id: 1,
                    })
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t('approve')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction(list.find((i) => i.status === 2)?.id || 0, 'reject')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('reject')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
