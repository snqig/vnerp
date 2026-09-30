'use client';

import { authFetch } from '@/lib/auth-fetch';
import { STOCKTAKING_TYPE_LABEL, SPLIT_FLAG_LABEL } from '@/lib/status-labels';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
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
import { Plus, Search, Edit, Trash2, QrCode, CheckCircle, XCircle, Eye, ClipboardCheck, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';

interface InventoryCheck {
  id: number;
  check_no: string;
  type: number;
  taking_type: number;
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

const TYPE_MAP = STOCKTAKING_TYPE_LABEL;
const SPLIT_FLAG_MAP = SPLIT_FLAG_LABEL;

export default function StocktakingPage() {
  const ts = useTranslations('Warehouse');
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
  // StandardTable：勾选（服务端分页，排序需后端支持）
  const [selectedRows, setSelectedRows] = useState<InventoryCheck[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InventoryCheck>>({});
  const [stats, setStats] = useState({
    pending: 0,
    counting: 0,
    completed: 0,
    difference: 0,
    monthlyCount: 0,
  });

  const [showScanDialog, setShowScanDialog] = useState(false);
  const [currentCheckId, setCurrentCheckId] = useState<number | null>(null);
  const [scanQrCode, setScanQrCode] = useState('');
  const [scanQuantity, setScanQuantity] = useState('');
  const [scanResult, setScanResult] = useState<Loose>(null);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItems, setDetailItems] = useState<InventoryCheckItem[]>([]);

  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const _exportColumns = [
    { key: 'check_no', header: t('checkNo') },
    { key: 'warehouse_name', header: t('warehouse') },
    { key: 'type_name', header: t('checkType') },
    { key: 'total_items', header: t('checkItems') },
    { key: 'diff_items', header: t('diffItems') },
    { key: 'diff_amount', header: t('diffAmount') },
    { key: 'status_name', header: tc('status') },
  ];

  const _getExportData = () =>
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
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        checkNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/stocktaking?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/warehouse/stocktaking/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, pageSize]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/stocktaking', {
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
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string, extraData?: Loose) => {
    try {
      const body: Loose = { id, action };
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
    } catch {
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
        toast({
          title: t('checkDeleteFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
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

    // P0-2（2026-09-26）：数量非空 ≠ 合法——"0"/"-5"/非数字此前都会 truthy 通过
    const qty = Number(scanQuantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast({ title: tc('stocktakeQtyInvalid'), variant: 'destructive' });
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
    } catch {
      toast({ title: t('scanCheckFailed'), variant: 'destructive' });
    }
  };

  const openDetailDialog = async (check: InventoryCheck) => {
    try {
      const res = await authFetch(`/api/warehouse/stocktaking/${check.id}/items`);
      const result = await res.json();
      if (result.success) {
        const detailitemsList = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setDetailItems(detailitemsList);
        setShowDetailDialog(true);
      }
    } catch {}
  };

  const columns: StandardTableColumn<InventoryCheck>[] = [
    {
      key: 'check_no',
      title: t('checkNo'),
      className: 'text-xs font-mono',
      render: (item) => item.check_no,
    },
    {
      key: 'warehouse_name',
      title: tc('warehouse'),
      className: 'text-xs',
      render: (item) => item.warehouse_name || '-',
    },
    {
      key: 'taking_type',
      title: tc('type'),
      className: 'text-xs',
      render: (item) => TYPE_MAP[item.taking_type] || '-',
    },
    {
      key: 'total_items',
      title: t('checkItems'),
      align: 'center',
      className: 'text-xs',
      render: (item) => item.total_items,
    },
    {
      key: 'diff_items',
      title: t('diffItems'),
      align: 'center',
      className: 'text-xs',
      render: (item) => item.diff_items,
    },
    {
      key: 'diff_amount',
      title: t('diffAmount'),
      align: 'center',
      className: 'text-xs font-mono',
      render: (item) => `¥${(Number(item.diff_amount) || 0).toFixed(2)}`,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (item) => {
        const st = STATUS_MAP[item.status] || STATUS_MAP[0];
        return (
          <Badge variant={st.variant} className="text-xs">
            {st.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      // 原有操作列：扫码 / 取消 / 提交 / 审批 / 详情 / 编辑 / 删除，逻辑保持原样
      render: (item) => (
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
              className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const detailColumns: StandardTableColumn<InventoryCheckItem>[] = [
    {
      key: 'qr_code',
      title: t('qrCodeCol'),
      className: 'font-mono text-xs',
      render: (item) => item.qr_code || '-',
    },
    {
      key: 'material_name',
      title: t('materialNameCol'),
      className: 'text-xs',
      render: (item) => item.material_name || '-',
    },
    {
      key: 'split_flag',
      title: tc('type'),
      className: 'text-xs',
      render: (item) => SPLIT_FLAG_MAP[item.split_flag] || t('whole'),
    },
    {
      key: 'book_quantity',
      title: t('bookQtyCol'),
      align: 'center',
      className: 'text-xs',
      render: (item) => item.book_quantity,
    },
    {
      key: 'actual_quantity',
      title: t('actualQtyCol'),
      align: 'center',
      className: 'text-xs',
      render: (item) => item.actual_quantity || '-',
    },
    {
      key: 'difference',
      title: t('diffQtyCol'),
      align: 'center',
      className: 'text-xs font-bold',
      render: (item) => (
        <span className={item.difference !== 0 ? 'text-red-600 dark:text-red-400' : ''}>
          {item.difference > 0 ? '+' : ''}
          {item.difference}
        </span>
      ),
    },
    {
      key: 'status',
      title: tc('status'),
      render: (item) => (
        <Badge variant={item.status === 1 ? 'default' : 'outline'} className="text-xs">
          {item.status === 0 ? t('unchecked') : item.status === 1 ? t('checked') : t('adjusted')}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('stocktaking')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <GlobalExportToolbar
              filename={ts('k_1uyxdj1')}
              title={ts('k_zfkd36')}
              columns={[
                { key: 'check_no', label: t('checkNo'), width: 18 },
                { key: 'warehouse_name', label: t('warehouse'), width: 15 },
                { key: 'type', label: tc('type'), width: 10, formatter: (v) => TYPE_MAP[v] || '-' },
                { key: 'total_items', label: t('checkItems'), width: 10 },
                { key: 'diff_items', label: t('diffItems'), width: 10 },
                {
                  key: 'diff_amount',
                  label: t('diffAmount'),
                  width: 12,
                  formatter: (v) => Number(v || 0).toFixed(2),
                },
                {
                  key: 'status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => STATUS_MAP[v]?.label || '-',
                },
              ]}
              data={selectedRows.length > 0 ? selectedRows : list}
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
        </div>        <StatsCards
          configs={[
            { key: 'pending', label: '待盘点', icon: Clock, ...StatsTheme.orange },
            { key: 'counting', label: '盘点中', icon: ClipboardCheck, ...StatsTheme.blue },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'difference', label: '差异待审批', icon: AlertTriangle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月盘点次数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'counting', count: stats.counting },
            { key: 'completed', count: stats.completed },
            { key: 'difference', count: stats.difference },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />



        <Card>
          <CardContent className="p-0">
            <StandardTable<InventoryCheck>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onRetry={fetchData}
              emptyText={t('noStocktakingRecords')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addStocktaking')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  {t('warehouse')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <WarehouseSelect
                  value={editItem.warehouse_id || ''}
                  onChange={(v) => setEditItem({ ...editItem, warehouse_id: Number(v) })}
                  placeholder={t('selectWarehouse')}
                />
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
                <Label>{tc('remark')}</Label>
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
                  {t('scanCheckQrCode')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  value={scanQrCode}
                  onChange={(e) => setScanQrCode(e.target.value)}
                  placeholder={tc('scanOrEnterQrCode')}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>
                  {t('scanCheckQuantity')} <span className="text-red-500 dark:text-red-400">*</span>
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
                      className={`col-span-2 font-bold ${scanResult.difference !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
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
            <StandardTable<InventoryCheckItem>
              columns={detailColumns}
              dataSource={detailItems}
              total={detailItems.length}
              rowKey="id"
              rowSelectable={false}
              showPagination={false}
              emptyText={t('noStocktakingRecords')}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('approveCheckTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('approver')}</Label>
                <UserSelect value="" onChange={(_v) => {}} />
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
