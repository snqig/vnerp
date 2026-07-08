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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  ink_code: string;
  ink_name: string;
  ink_type: number;
  color_name: string;
  color_code: string;
  brand: string;
  unit: string;
  stock_qty: number;
  safety_stock: number;
  status: number;
}

// typeMap will be populated dynamically with translations
type SortField = 'ink_code' | 'ink_name' | 'ink_type' | 'stock_qty' | 'safety_stock' | 'status';
type SortDir = 'asc' | 'desc';

export default function InkManagementPage() {

  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  const typeMap: Record<number, string> = {
    1: t('waterInk'),
    2: t('solventInk'),
    3: t('uvInk'),
    4: t('screenInk'),
    5: t('specialInk'),
  };

  const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    1: { label: tc('enabled'), variant: 'default' },
    0: { label: tc('disabled'), variant: 'destructive' },
  };

  const exportColumns = [
    { key: 'ink_code', header: t('inkCode') },
    { key: 'ink_name', header: t('inkName') },
    { key: 'ink_type_label', header: tc('type') },
    { key: 'color_name', header: t('color') },
    { key: 'color_code', header: t('colorCode') },
    { key: 'brand', header: tc('brand') },
    { key: 'unit', header: tc('unit') },
    { key: 'stock_qty', header: t('stock') },
    { key: 'safety_stock', header: t('safetyStock') },
    { key: 'status_label', header: tc('status') },
  ];

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [sortField, setSortField] = useState<SortField>('ink_code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        inkCode: searchCode,
        inkName: searchName,
      });
      if (searchType) params.set('inkType', searchType);
      if (searchStatus) params.set('status', searchStatus);
      const res = await authFetch('/api/prepress/ink?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
    }
  }, [page, searchCode, searchName, searchType, searchStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedList = [...list].sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    let cmp = 0;
    if (typeof va === 'string' && typeof vb === 'string') {
      cmp = va.localeCompare(vb, 'zh-CN');
    } else {
      cmp = (va as number) - (vb as number);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedList.map((s) => s.id)));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />
    );
  };

  const getExportData = () =>
    sortedList.map((item) => ({
      ...item,
      ink_type_label: typeMap[item.ink_type] || '-',
      status_label: statusMap[item.status]?.label || '-',
    }));

  const handlePrint = () => {
    printTable(getExportData(), exportColumns, t('inkManagement'));
  };

  const handleExportPDF = () => {
    exportTableToPDF(getExportData(), t('inkManagement'), exportColumns, t('inkManagement'));
  };

  const handleExportXLS = () => {
    exportTableToXLS(getExportData(), t('inkManagement'), exportColumns);
  };

  const handleExportWORD = () => {
    exportTableToWORD(getExportData(), t('inkManagement'), exportColumns, t('inkManagement'));
  };

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/prepress/ink', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/prepress/ink?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('inkManagement')}</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addInk')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Input
                placeholder={t('inkCode')}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-32 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Input
                placeholder={t('inkName')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-32 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Select
                value={searchType}
                onValueChange={(v) => {
                  setSearchType(v === '_all' ? '' : v);
                }}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={t('allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('allTypes')}</SelectItem>
                  {Object.entries(typeMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={searchStatus}
                onValueChange={(v) => {
                  setSearchStatus(v === '_all' ? '' : v);
                }}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={t('allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('allStatus')}</SelectItem>
                  <SelectItem value="1">{tc("enable")}</SelectItem>
                  <SelectItem value="0">{tc("disable")}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" onClick={fetchData}>
                <Search className="h-3 w-3 mr-1" />
                {tc('search')}
              </Button>
              <div className="ml-auto">
                <GlobalExportToolbar
                  filename="油墨管理"
                  title="油墨管理"
                  columns={[
                    { key: 'ink_code', label: t('inkCode'), width: 15 },
                    { key: 'ink_name', label: t('inkName'), width: 20 },
                    { key: 'ink_type', label: tc('type'), width: 10, formatter: (v) => typeMap[v] || '-' },
                    { key: 'color_name', label: tc('color'), width: 10 },
                    { key: 'color_code', label: t('colorCode'), width: 10 },
                    { key: 'brand', label: tc('brand'), width: 12 },
                    { key: 'unit', label: tc('unit'), width: 8 },
                    { key: 'stock_qty', label: t('stock'), width: 10 },
                    { key: 'safety_stock', label: t('safetyStock'), width: 10 },
                    { key: 'status', label: tc('status'), width: 10, formatter: (v) => statusMap[v]?.label || '-' },
                  ]}
                  data={selectedIds.size > 0 ? sortedList.filter((i) => selectedIds.has(i.id)) : sortedList}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === sortedList.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">{tc("serialNo")}</TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('ink_code')}
                  >
                    <span className="flex items-center">
                      {t('inkCode')}
                      <SortIcon field="ink_code" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('ink_name')}
                  >
                    <span className="flex items-center">
                      {t('inkName')}
                      <SortIcon field="ink_name" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('ink_type')}
                  >
                    <span className="flex items-center">
                      {tc('type')}
                      <SortIcon field="ink_type" />
                    </span>
                  </TableHead>
                  <TableHead className="text-xs">{tc("color")}</TableHead>
                  <TableHead className="text-xs">{t('colorCode')}</TableHead>
                  <TableHead className="text-xs">{tc("brand")}</TableHead>
                  <TableHead className="text-xs">{tc("unit")}</TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('stock_qty')}
                  >
                    <span className="flex items-center">
                      {t('stock')}
                      <SortIcon field="stock_qty" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('safety_stock')}
                  >
                    <span className="flex items-center">
                      {t('safetyStock')}
                      <SortIcon field="safety_stock" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center">
                      {tc('status')}
                      <SortIcon field="status" />
                    </span>
                  </TableHead>
                  <TableHead className="text-xs">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList.map((item, index) => {
                  const st = statusMap[item.status] ?? statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{item.ink_code}</TableCell>
                      <TableCell className="text-xs">{item.ink_name}</TableCell>
                      <TableCell className="text-xs">{typeMap[item.ink_type] || '-'}</TableCell>
                      <TableCell className="text-xs">{item.color_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.color_code || '-'}</TableCell>
                      <TableCell className="text-xs">{item.brand || '-'}</TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-xs">
                        {item.stock_qty ?? 0}
                        {item.stock_qty < item.safety_stock && (
                          <span className="text-red-500 ml-1">⚠</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.safety_stock}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
                {sortedList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-gray-400 py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">{tc('total', { count: total })}</span>
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
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? t('editInk') : t('addInk')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('inkCode')}</Label>
                <Input
                  value={editItem.ink_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, ink_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('inkName')}</Label>
                <Input
                  value={editItem.ink_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, ink_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc("type")}</Label>
                <Select
                  value={String(editItem.ink_type || 4)}
                  onValueChange={(v) => setEditItem({ ...editItem, ink_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('waterInk')}</SelectItem>
                    <SelectItem value="2">{t('solventInk')}</SelectItem>
                    <SelectItem value="3">{t('uvInk')}</SelectItem>
                    <SelectItem value="4">{t('screenInk')}</SelectItem>
                    <SelectItem value="5">{t('specialInk')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('colorName')}</Label>
                <Input
                  value={editItem.color_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('colorCode')}</Label>
                <Input
                  value={editItem.color_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc("brand")}</Label>
                <Input
                  value={editItem.brand || ''}
                  onChange={(e) => setEditItem({ ...editItem, brand: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc("unit")}</Label>
                <Input
                  value={editItem.unit || 'kg'}
                  onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('safetyStock')}</Label>
                <Input
                  type="number"
                  value={editItem.safety_stock ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, safety_stock: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
