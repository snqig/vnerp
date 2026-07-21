'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  QrCode,
  PackageOpen,
  PackageCheck,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { useTranslations } from 'next-intl';

interface TransferOrder {
  id: number;
  transfer_no: string;
  type: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  from_location: string | null;
  to_location: string | null;
  status: number;
  applicant_id: number | null;
  approver_id: number | null;
  out_time: string | null;
  in_time: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  applicant_name?: string;
  approver_name?: string;
  type_name?: string;
  status_name?: string;
}

interface TransferItem {
  id: number;
  transfer_id: number;
  material_id: number;
  qr_code: string | null;
  quantity: number;
  out_quantity: number;
  in_quantity: number;
  unit: string | null;
  batch_no: string | null;
  material_name?: string;
}

export default function TransferPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const TYPE_MAP: Record<number, string> = {
    1: t('locationTransfer'),
    2: t('warehouseTransfer'),
  };

  const STATUS_MAP: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    0: { label: tc('draft'), variant: 'outline' },
    1: { label: tc('pending'), variant: 'secondary' },
    2: { label: t('outbound'), variant: 'default' },
    3: { label: t('inbound'), variant: 'default' },
    4: { label: t('cancelled'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<TransferOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TransferOrder>>({});
  const [locations, setLocations] = useState<
    { id: number; code: string; name: string; wh_id: number }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showOutboundDialog, setShowOutboundDialog] = useState(false);
  const [showInboundDialog, setShowInboundDialog] = useState(false);
  const [currentTransferId, setCurrentTransferId] = useState<number | null>(null);
  const [_transferItems, _setTransferItems] = useState<TransferItem[]>([]);
  const [scanItems, setScanItems] = useState<
    { material_id: number; qr_code: string; quantity: number }[]
  >([]);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItems, setDetailItems] = useState<TransferItem[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<TransferOrder | null>(null);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        transferNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/transfer?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchLocations = async (whId: number) => {
    try {
      const res = await authFetch(`/api/warehouse/locations?wh_id=${whId}`);
      const result = await res.json();
      if (result.success) {
        const locationsList = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setLocations(locationsList);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    if (!editItem.from_warehouse_id) {
      toast({ title: t('selectSourceWarehouseFirst'), variant: 'destructive' });
      return;
    }
    if (!editItem.to_warehouse_id) {
      toast({ title: t('selectTargetWarehouseFirst'), variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch('/api/warehouse/transfer', {
        method: 'POST',
        body: JSON.stringify({
          type: editItem.type || 1,
          from_warehouse_id: editItem.from_warehouse_id,
          to_warehouse_id: editItem.to_warehouse_id,
          from_location: editItem.from_location,
          to_location: editItem.to_location,
          applicant_id: editItem.applicant_id,
          remark: editItem.remark,
        }),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: t('createSuccess') });
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

      const res = await authFetch('/api/warehouse/transfer', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: tc('success') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/warehouse/transfer?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: t('deleteFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const openOutboundDialog = async (transfer: TransferOrder) => {
    setCurrentTransferId(transfer.id);
    try {
      const res = await authFetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        const transferitemsList = Array.isArray(result.data)
          ? result.data
          : result.data?.list || [];
        setTransferItems(transferitemsList);
        setScanItems([]);
        setShowOutboundDialog(true);
      }
    } catch {}
  };

  const executeOutbound = async () => {
    if (!currentTransferId || scanItems.length === 0) {
      toast({ title: t('addOutboundItemsFirst'), variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch(`/api/warehouse/transfer/${currentTransferId}/outbound`, {
        method: 'POST',
        body: JSON.stringify({ items: scanItems }),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: t('outboundSuccessQty', { qty: result.data.out_quantity }) });
        setShowOutboundDialog(false);
        fetchData();
      } else {
        toast({ title: t('outboundFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('outboundFailed'), variant: 'destructive' });
    }
  };

  const openInboundDialog = async (transfer: TransferOrder) => {
    setCurrentTransferId(transfer.id);
    try {
      const res = await authFetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        const transferitemsList = Array.isArray(result.data)
          ? result.data
          : result.data?.list || [];
        setTransferItems(transferitemsList);
        setScanItems([]);
        setShowInboundDialog(true);
      }
    } catch {}
  };

  const openDetailDialog = async (transfer: TransferOrder) => {
    setCurrentTransfer(transfer);
    try {
      const res = await authFetch(`/api/warehouse/transfer/${transfer.id}/items`);
      const result = await res.json();
      if (result.success) {
        const detailitemsList = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setDetailItems(detailitemsList);
        setShowDetailDialog(true);
      }
    } catch {}
  };

  const executeInbound = async () => {
    if (!currentTransferId || scanItems.length === 0) {
      toast({ title: t('addInboundItemsFirst'), variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch(`/api/warehouse/transfer/${currentTransferId}/inbound`, {
        method: 'POST',
        body: JSON.stringify({ items: scanItems }),
      });
      const result = await res.json();

      if (result.success) {
        toast({ title: t('inboundSuccessQty', { qty: result.data.in_quantity }) });
        setShowInboundDialog(false);
        fetchData();
      } else {
        toast({ title: t('inboundFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('inboundFailed'), variant: 'destructive' });
    }
  };

  const addScanItem = () => {
    setScanItems([...scanItems, { material_id: 0, qr_code: '', quantity: 0 }]);
  };

  const updateScanItem = (
    index: number,
    field: 'material_id' | 'qr_code' | 'quantity',
    value: Loose
  ) => {
    const updated = [...scanItems];
    updated[index] = { ...updated[index], [field]: value };
    setScanItems(updated);
  };

  const removeScanItem = (index: number) => {
    setScanItems(scanItems.filter((_, i) => i !== index));
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedList = useCallback(() => {
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      const aVal = (a as Loose)[sortField];
      const bVal = (b as Loose)[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'zh-CN')
          : bVal.localeCompare(aVal, 'zh-CN');
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [list, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((item) => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none border border-border bg-muted/50 text-muted-foreground text-center whitespace-nowrap hover:bg-muted/70 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('transfer')}</h1>
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
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addTransfer')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table className="border-collapse border border-border">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center w-12">
                    <Checkbox
                      checked={selectedIds.length === list.length && list.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <SortableHeader field="transfer_no">{t('transferNo')}</SortableHeader>
                  <SortableHeader field="type">{tc('type')}</SortableHeader>
                  <SortableHeader field="from_warehouse_name">
                    {t('sourceWarehouse')}
                  </SortableHeader>
                  <SortableHeader field="to_warehouse_name">{t('targetWarehouse')}</SortableHeader>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">
                    {tc('status')}
                  </TableHead>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">
                    {t('applicant')}
                  </TableHead>
                  <TableHead className="border border-border bg-muted/50 text-muted-foreground text-center">
                    {tc('actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList().map((item) => {
                  const st = STATUS_MAP[item.status] || STATUS_MAP[0];
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 even:bg-muted/20">
                      <TableCell className="border border-border text-center">
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="border border-border text-center font-mono text-xs">
                        {item.transfer_no}
                      </TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        {TYPE_MAP[item.type] || '-'}
                      </TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        <div>{item.from_warehouse_name || '-'}</div>
                        {item.from_location && (
                          <div className="text-muted-foreground text-[10px]">
                            {item.from_location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        <div>{item.to_warehouse_name || '-'}</div>
                        {item.to_location && (
                          <div className="text-muted-foreground text-[10px]">
                            {item.to_location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="border border-border text-center">
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="border border-border text-center text-xs">
                        {item.applicant_name || '-'}
                      </TableCell>
                      <TableCell className="border border-border text-center">
                        <div className="flex gap-1 justify-center">
                          {[0, 1].includes(item.status) && (
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
                              onClick={() => handleAction(item.id, 'approve', { approver_id: 1 })}
                            >
                              {t('approveTransfer')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openOutboundDialog(item)}
                            >
                              <PackageOpen className="h-3 w-3 mr-1" />
                              {t('scanOut')}
                            </Button>
                          )}
                          {item.status === 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => openInboundDialog(item)}
                            >
                              <PackageCheck className="h-3 w-3 mr-1" />
                              {t('scanIn')}
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
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8 border border-border"
                    >
                      {t('noTransferRecords')}
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
              <DialogTitle>{t('addTransferOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  {t('transferType')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(editItem.type || 1)}
                  onValueChange={(v) => {
                    const type = Number(v);
                    setEditItem({ ...editItem, type });
                    if (type === 1 && editItem.from_warehouse_id) {
                      fetchLocations(editItem.from_warehouse_id);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('locationTransfer')}</SelectItem>
                    <SelectItem value="2">{t('warehouseTransfer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {t('sourceWarehouse')} <span className="text-red-500">*</span>
                </Label>
                <WarehouseSelect
                  value={editItem.from_warehouse_id}
                  onChange={(v) => {
                    const whId = Number(v);
                    setEditItem({ ...editItem, from_warehouse_id: whId });
                    if (editItem.type === 1) {
                      fetchLocations(whId);
                    }
                  }}
                  placeholder={t('selectSourceWarehouse')}
                />
              </div>
              {editItem.type === 1 && (
                <>
                  <div>
                    <Label>{t('outLocationRequired')}</Label>
                    <Select
                      value={editItem.from_location || ''}
                      onValueChange={(v) => setEditItem({ ...editItem, from_location: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectOutLocation')} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.code}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('inLocationRequired')}</Label>
                    <Select
                      value={editItem.to_location || ''}
                      onValueChange={(v) => setEditItem({ ...editItem, to_location: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectInLocation')} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.code}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label>
                  {t('targetWarehouse')} <span className="text-red-500">*</span>
                </Label>
                <WarehouseSelect
                  value={editItem.to_warehouse_id}
                  onChange={(v) => setEditItem({ ...editItem, to_warehouse_id: Number(v) })}
                  placeholder={t('selectTargetWarehouse')}
                />
              </div>
              <div>
                <Label>{tc('applicant')}</Label>
                <UserSelect
                  value={editItem.applicant_id ? String(editItem.applicant_id) : ''}
                  onChange={(v) => setEditItem({ ...editItem, applicant_id: Number(v) })}
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
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOutboundDialog} onOpenChange={setShowOutboundDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('scanOut')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t('transferDetail')}</span>
                  <Button size="sm" variant="outline" onClick={addScanItem}>
                    <QrCode className="h-3 w-3 mr-1" />
                    {t('addScanItem')}
                  </Button>
                </div>
                {scanItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    {t('clickToAddOutbound')}
                  </p>
                ) : (
                  scanItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">{t('qrCodeCol')}</Label>
                        <Input
                          value={item.qr_code}
                          onChange={(e) => updateScanItem(index, 'qr_code', e.target.value)}
                          placeholder={tc('scanOrEnterQrCode')}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{tc('quantity')}</Label>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            updateScanItem(index, 'quantity', Number(e.target.value))
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{t('materialId')}</Label>
                        <Input
                          type="number"
                          value={item.material_id || ''}
                          onChange={(e) =>
                            updateScanItem(index, 'material_id', Number(e.target.value))
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => removeScanItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOutboundDialog(false)}>
                {tc('close')}
              </Button>
              <Button onClick={executeOutbound}>
                <PackageOpen className="h-4 w-4 mr-1" />
                {t('confirmOutbound')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInboundDialog} onOpenChange={setShowInboundDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('scanIn')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t('inboundDetail')}</span>
                  <Button size="sm" variant="outline" onClick={addScanItem}>
                    <QrCode className="h-3 w-3 mr-1" />
                    {t('addScanItem')}
                  </Button>
                </div>
                {scanItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    {t('clickToAddInbound')}
                  </p>
                ) : (
                  scanItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">{t('qrCodeCol')}</Label>
                        <Input
                          value={item.qr_code}
                          onChange={(e) => updateScanItem(index, 'qr_code', e.target.value)}
                          placeholder={tc('scanOrEnterQrCode')}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{tc('quantity')}</Label>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            updateScanItem(index, 'quantity', Number(e.target.value))
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{t('materialId')}</Label>
                        <Input
                          type="number"
                          value={item.material_id || ''}
                          onChange={(e) =>
                            updateScanItem(index, 'material_id', Number(e.target.value))
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => removeScanItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInboundDialog(false)}>
                {tc('close')}
              </Button>
              <Button onClick={executeInbound}>
                <PackageCheck className="h-4 w-4 mr-1" />
                {t('confirmInbound')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto" resizable>
            <DialogHeader>
              <DialogTitle>
                {t('transferDetailTitle', { transferNo: currentTransfer?.transfer_no || '' })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {currentTransfer && (
                <div className="grid grid-cols-4 gap-4 p-3 border rounded bg-muted/30 text-sm">
                  <div>
                    <span className="text-muted-foreground">{tc('type')}：</span>
                    {TYPE_MAP[currentTransfer.type]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('sourceWarehouse')}：</span>
                    {currentTransfer.from_warehouse_name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('targetWarehouse')}：</span>
                    {currentTransfer.to_warehouse_name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('status')}：</span>
                    <Badge variant={(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).variant}>
                      {(STATUS_MAP[currentTransfer.status] || STATUS_MAP[0]).label}
                    </Badge>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('materialName')}</TableHead>
                    <TableHead>{t('qrCodeCol')}</TableHead>
                    <TableHead>{tc('batchNo')}</TableHead>
                    <TableHead>{t('qtyPlan')}</TableHead>
                    <TableHead>{tc('stockedOut')}</TableHead>
                    <TableHead>{tc('stockedIn')}</TableHead>
                    <TableHead>{tc('unit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        {t('noDetailData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.material_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.qr_code || '-'}</TableCell>
                        <TableCell>{item.batch_no || '-'}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.out_quantity}</TableCell>
                        <TableCell className="text-center">{item.in_quantity}</TableCell>
                        <TableCell>{item.unit || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
