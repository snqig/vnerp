'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, FileText, Download, CheckCircle, Clock, AlertTriangle, PlusCircle, History as HistoryIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface SOPRecord {
  id?: number;
  sop_no: string;
  sop_name: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  process_code: string;
  process_name: string;
  version: string;
  sop_type: string;
  content: string;
  file_url: string;
  workshop: string;
  equipment_type: string;
  effective_date: string;
  status: number;
  remark: string;
  create_time: string;
}

export default function SOPManagementPage() {
  const t = useTranslations('Engineering');
  const tc = useTranslations('Common');

  const sopTypeMap: Record<string, string> = {
    printing: t('silkScreen'),
    die_cut: t('dieCut'),
    trademark: t('trademark'),
    inspection: t('inspection'),
    packaging: t('packaging'),
    other: tc('other'),
  };
  const workshopMap: Record<string, string> = {
    die_cut: t('dieCutWorkshop'),
    trademark: t('trademarkWorkshop'),
    printing: t('silkScreenWorkshop'),
    all: tc('all'),
  };
  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('draft'), variant: 'outline' },
    2: { label: t('published'), variant: 'default' },
    3: { label: t('obsolete'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<SOPRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchType, setSearchType] = useState('');
  // 统计口径与 /api/engineering/sop/stats 返回对齐：
  // eng_sop 表没有审核状态列，改用 effective_date 生命周期列做「已生效 / 待生效」。
  const [stats, setStats] = useState({
    total: 0,
    effective: 0,
    pendingEffective: 0,
    monthlyNew: 0,
    withVersion: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SOPRecord>>({});
  const [uploading, setUploading] = useState(false);
  const _fileInputRef = useState<HTMLInputElement | null>(null);

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch('/api/upload/sop', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        setEditItem({ ...editItem, file_url: result.data.url });
        toast({ title: t('uploadSuccess') });
      } else {
        toast({ title: t('uploadFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('uploadFailed'), variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || t('defaultSopFileName');
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        productName: searchProduct,
        sopType: searchType,
      });
      const res = await authFetch('/api/engineering/sop?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/engineering/sop/stats');
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
  }, [page]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/engineering/sop', {
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
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/engineering/sop?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    const ids = selectedRows;
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/engineering/sop?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    fetchData();
  };

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const columns: StandardTableColumn<SOPRecord>[] = [
    { key: 'sop_no', title: t('sopNo'), render: (row) => <span className="font-mono text-sm">{row.sop_no}</span> },
    { key: 'sop_name', title: t('sopName'), render: (row) => row.sop_name },
    { key: 'product_name', title: t('productName'), render: (row) => row.product_name },
    { key: 'process_name', title: t('process'), render: (row) => row.process_name || '-' },
    { key: 'version', title: t('version'), render: (row) => row.version },
    { key: 'sop_type', title: t('type'), render: (row) => sopTypeMap[row.sop_type] || row.sop_type },
    { key: 'workshop', title: t('workshop'), render: (row) => workshopMap[row.workshop] || row.workshop || '-' },
    {
      key: 'status',
      title: tc('status'),
      render: (row) => (
        <Badge variant={statusMap[row.status]?.variant || 'outline'}>
          {statusMap[row.status]?.label || tc('unknown')}
        </Badge>
      ),
    },
    { key: 'effective_date', title: t('effectiveDate'), render: (row) => row.effective_date?.substring(0, 10) || '-' },
    {
      key: 'file_url',
      title: t('sopFile'),
      render: (row) =>
        row.file_url ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => handleDownload(row.file_url, row.sop_name + '.pdf')}
          >
            <FileText className="h-3 w-3 mr-1" />
            {t('viewPdf')}
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">{tc('none')}</span>
        ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      width: 120,
      render: (row) => (
        <div className="flex gap-1 justify-end">
          {row.file_url && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              title={t('downloadSopFile')}
              onClick={() => handleDownload(row.file_url, row.sop_name + '.pdf')}
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditItem(row);
              setShowDialog(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleDelete(row.id!)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout title={t('sopManagement')}>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: 'SOP总数', icon: FileText, ...StatsTheme.blue },
            { key: 'effective', label: '已生效', icon: CheckCircle, ...StatsTheme.green },
            { key: 'pendingEffective', label: '待生效', icon: Clock, ...StatsTheme.orange },
            { key: 'monthlyNew', label: '本月新增', icon: PlusCircle, ...StatsTheme.cyan },
            { key: 'withVersion', label: '有版本SOP', icon: HistoryIcon, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: stats.total },
            { key: 'effective', count: stats.effective },
            { key: 'pendingEffective', count: stats.pendingEffective },
            { key: 'monthlyNew', count: stats.monthlyNew },
            { key: 'withVersion', count: stats.withVersion },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchProductPlaceholder')}
                    className="pl-8 w-60"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('sopType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                    {Object.entries(sopTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  {tc('search')}
                </Button>
              </div>
              <Button
                onClick={() => {
                  setEditItem({ version: 'V1.0', sop_type: 'printing' });
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('newSop')}
              </Button>
            </div>

            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable<SOPRecord>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              showPagination={totalPages > 1}
              onPageChange={setPage}
              rowSelectable
              selectedRows={list.filter((r) => selectedRows.includes(r.id!))}
              onRowSelectedChange={(rows) => setSelectedRows(rows.map((r) => r.id!))}
              rowKey="id"
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? t('editSop') : t('newSop')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{t('productCode')}</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('productName')} *</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('processCode')}</Label>
                <Input
                  value={editItem.process_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, process_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('processName')}</Label>
                <Input
                  value={editItem.process_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, process_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('version')}</Label>
                <Input
                  value={editItem.version || 'V1.0'}
                  onChange={(e) => setEditItem({ ...editItem, version: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('sopType')}</Label>
                <Select
                  value={editItem.sop_type || 'printing'}
                  onValueChange={(v) => setEditItem({ ...editItem, sop_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sopTypeMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('applicableWorkshop')}</Label>
                <Select
                  value={editItem.workshop || 'die_cut'}
                  onValueChange={(v) => setEditItem({ ...editItem, workshop: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(workshopMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('equipmentType')}</Label>
                <Input
                  value={editItem.equipment_type || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_type: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('effectiveDate')}</Label>
                <Input
                  type="date"
                  value={editItem.effective_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, effective_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('sopPdf')}</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {editItem.file_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleDownload(
                          editItem.file_url!,
                          editItem.sop_name || t('defaultSopFileName')
                        )
                      }
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {tc('download')}
                    </Button>
                  )}
                </div>
                {editItem.file_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('uploaded')}: {editItem.file_url}
                  </p>
                )}
                {uploading && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{t('uploading')}...</p>}
              </div>
              <div className="col-span-2">
                <Label>{t('sopContent')}</Label>
                <Textarea
                  rows={5}
                  value={editItem.content || ''}
                  onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
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
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
