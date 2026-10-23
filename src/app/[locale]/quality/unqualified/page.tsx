'use client';

import { authFetch } from '@/lib/auth-fetch';
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
import { Plus, Search, Trash2, XCircle, CheckCircle, Clock, Wrench, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useDebounce } from '@/hooks/use-debounce';
import {
  buildQualityFormMessages,
  buildUnqualifiedCreateSchema,
  buildUnqualifiedStartSchema,
  buildUnqualifiedCompleteSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';

interface Item {
  id: number;
  unqualified_no: string;
  handle_no: string | null;
  inspection_id: number | null;
  source_type: string | null;
  source_no: string | null;
  material_id: number | null;
  material_code: string | null;
  material_name: string | null;
  quantity: number;
  defect_type: string | null;
  defect_desc: string | null;
  handle_type: number | null;
  handle_status: number;
  handle_result: number | null;
  responsible_dept: string | null;
  responsible_person: string | null;
  cost_amount: number | null;
  handler: string | null;
  handle_date: string | null;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
}

// 处理方式映射（DB 码：1-返工, 2-报废, 3-让步接收, 4-退货）
const typeMap: Record<number, string> = {
  1: 'rework',
  2: 'scrap',
  3: 'concessionAccept',
  4: 'return',
};

// 质检单下拉选项（用于自动带出检验单号/来源/物料）
interface InspectionOption {
  id: number;
  inspection_no: string;
  inspection_type: number | null;
  source_type: string;
  source_no: string;
  material_id: number;
  batch_no: string | null;
  unqualified_qty: number;
  material_code: string;
  material_name: string;
}

type ActionMode = 'create' | 'start' | 'complete';

export default function UnqualifiedPage() {
  const ts = useTranslations('Quality');
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: 'pending', variant: 'outline' },
    2: { label: 'processing', variant: 'default' },
    3: { label: 'completed', variant: 'secondary' },
  };

  const _exportColumns = [
    { key: 'handle_no', header: t('handleNo') },
    { key: 'material_code', header: tc('materialCode') },
    { key: 'material_name', header: tc('materialName') },
    { key: 'quantity', header: t('unqualifiedQty') },
    { key: 'handle_type', header: t('handlingMethod') },
    { key: 'responsible_dept', header: t('responsibleDept') },
    { key: 'responsible_person', header: t('responsiblePerson') },
    { key: 'handle_status', header: tc('status') },
  ];

  const { toast } = useToast();

  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>('create');
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    processed: 0,
    closed: 0,
    monthlyCount: 0,
  });
  const [materialValid, setMaterialValid] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const debouncedMaterialCode = useDebounce(editItem.material_code || '', 400);

  useEffect(() => {
    const code = debouncedMaterialCode.trim();
    if (!code) {
      setMaterialValid('unknown');
      return;
    }
    const ac = new AbortController();
    setMaterialValid('unknown');
    authFetch('/api/materials?keyword=' + encodeURIComponent(code) + '&pageSize=20', { signal: ac.signal })
      .then(r => r.json())
      .then(res => {
        if (!res.success) { setMaterialValid('invalid'); return; }
        const list = res.data?.list || res.list || [];
        const match = list.find((m: any) => m.material_code?.trim().toLowerCase() === code.toLowerCase());
        if (match) {
          setMaterialValid('valid');
          setEditItem(prev => ({
            ...prev,
            material_code: match.material_code,
            material_name: prev.material_name && prev.material_name !== '' ? prev.material_name : match.material_name,
          }));
        } else {
          setMaterialValid('invalid');
        }
      })
      .catch(() => { /* abort or network error — keep unknown */ });
    return () => ac.abort();
  }, [debouncedMaterialCode]);

  // 质检单下拉（新增时选择检验单号，自动带出来源与物料）
  const [inspections, setInspections] = useState<InspectionOption[]>([]);
  useEffect(() => {
    authFetch('/api/quality/inspections?pageSize=300')
      .then((r) => r.json())
      .then((res) => {
        const list = res.data?.list || res.list || [];
        setInspections(list);
      })
      .catch(() => {});
  }, []);

  const handleSelectInspection = (value: string) => {
    const found = inspections.find((i) => String(i.id) === value);
    if (!found) return;
    setEditItem((prev) => ({
      ...prev,
      inspection_id: found.id,
      source_type: found.source_type,
      source_no: found.source_no,
      material_id: found.material_id,
      material_code: found.material_code,
      material_name: found.material_name,
      quantity: prev.quantity || (found.unqualified_qty > 0 ? found.unqualified_qty : undefined),
    }));
  };

  // 部门/人员 datalist（117+10 条，一次拉完）
  const [departments, setDepartments] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  useEffect(() => {
    authFetch('/api/organization/department?pageSize=500').then(r => r.json()).then(res => {
      const list = res.data?.list || res.list || [];
      setDepartments([...new Set(list.map((d: any): string => d.dept_name).filter(Boolean))] as string[]);
    }).catch(() => {});
    authFetch('/api/organization/employee?pageSize=500').then(r => r.json()).then(res => {
      const list = res.data?.list || res.list || [];
      // sys_employee 人名字段是 name（real_name/username 不存在，曾致人员下拉恒空）
      setPersons([...new Set(list.filter((u: any) => u.status === 1).map((u: any): string => u.name).filter(Boolean))] as string[]);
    }).catch(() => {});
  }, []);

  // StandardTable：勾选（服务端分页，排序需后端支持）
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);

  // start/complete 表单状态
  const [startForm, setStartForm] = useState({
    handle_type: 1,
    responsible_dept: '',
    responsible_person: '',
  });
  const [completeForm, setCompleteForm] = useState({
    handler: '',
    handle_result: 1,
    cost_amount: 0,
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        handleNo: searchNo,
      });
      const res = await authFetch('/api/quality/unqualified?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/unqualified/stats');
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

  const openCreateDialog = () => {
    setActionMode('create');
    setEditItem({});
    setMaterialValid('unknown');
    setShowDialog(true);
  };

  const openStartDialog = (item: Item) => {
    setActionMode('start');
    setEditItem(item);
    setStartForm({
      handle_type: item.handle_type || 1,
      responsible_dept: item.responsible_dept || '',
      responsible_person: item.responsible_person || '',
    });
    setShowDialog(true);
  };

  const openCompleteDialog = (item: Item) => {
    setActionMode('complete');
    setEditItem(item);
    setCompleteForm({
      handler: item.handler || '',
      handle_result: item.handle_result || 1,
      cost_amount: item.cost_amount || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const msgs = buildQualityFormMessages((k) => tc(k));
    try {
      if (actionMode === 'create') {
        const parsed = buildUnqualifiedCreateSchema(msgs).safeParse({
          ...editItem,
          handle_type:
            typeof editItem.handle_type === 'number'
              ? ['rework', 'scrap', 'concession', 'return'][editItem.handle_type - 1]
              : editItem.handle_type,
        });
        if (!parsed.success) {
          toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
          return;
        }
        // 前端拦截：物料编码必须存在且已验证通过
        if (!editItem.material_code?.trim()) {
          toast({ title: tc('materialCodeRequired'), variant: 'destructive' });
          return;
        }
        if (materialValid === 'invalid') {
          toast({
            title: tc('materialNotFound', { code: editItem.material_code }),
            variant: 'destructive',
          });
          return;
        }
        const payload: Record<string, unknown> = { ...parsed.data };
        const res = await authFetch('/api/quality/unqualified', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('createSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      } else if (actionMode === 'start') {
        const parsed = buildUnqualifiedStartSchema(msgs).safeParse({
          action: 'start',
          id: editItem.id,
          handle_type: ['rework', 'scrap', 'concession', 'return'][startForm.handle_type - 1],
          responsible_dept: startForm.responsible_dept,
          responsible_person: startForm.responsible_person,
        });
        if (!parsed.success) {
          toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
          return;
        }
        const res = await authFetch('/api/quality/unqualified', {
          method: 'PUT',
          body: JSON.stringify(parsed.data),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('updateSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      } else if (actionMode === 'complete') {
        const parsed = buildUnqualifiedCompleteSchema(msgs).safeParse({
          action: 'complete',
          id: editItem.id,
          handler: completeForm.handler,
          handle_result: completeForm.handle_result,
          cost_amount: completeForm.cost_amount,
        });
        if (!parsed.success) {
          toast({ title: firstZodMessage(parsed.error), variant: 'destructive' });
          return;
        }
        const res = await authFetch('/api/quality/unqualified', {
          method: 'PUT',
          body: JSON.stringify(parsed.data),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: tc('updateSuccess') });
          setShowDialog(false);
          fetchData();
        } else {
          toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/quality/unqualified?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'serialNo',
      title: tc('serialNo'),
      align: 'center',
      width: 48,
      className: 'text-xs text-muted-foreground',
      render: (_item, index) => (page - 1) * pageSize + index + 1,
    },
    {
      key: 'handle_no',
      title: t('handleNo'),
      className: 'text-xs font-mono',
      render: (item) => item.handle_no || '-',
    },
    {
      key: 'material_code',
      title: tc('materialCode'),
      className: 'text-xs',
      render: (item) => item.material_code || '-',
    },
    {
      key: 'material_name',
      title: tc('materialName'),
      className: 'text-xs',
      render: (item) => item.material_name || '-',
    },
    {
      key: 'quantity',
      title: t('unqualifiedQty'),
      className: 'text-xs',
      render: (item) => item.quantity,
    },
    {
      key: 'handle_type',
      title: t('handlingMethod'),
      className: 'text-xs',
      render: (item) => (item.handle_type ? t(typeMap[item.handle_type] || '-') : '-'),
    },
    {
      key: 'responsible_dept',
      title: t('responsibleDept'),
      className: 'text-xs',
      render: (item) => item.responsible_dept || '-',
    },
    {
      key: 'responsible_person',
      title: t('responsiblePerson'),
      className: 'text-xs',
      render: (item) => item.responsible_person || '-',
    },
    {
      key: 'handle_status',
      title: tc('status'),
      render: (item) => {
        const st = statusMap[item.handle_status] || statusMap[1];
        return (
          <Badge variant={st.variant} className="text-xs">
            {t(st.label)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      // 原有操作列：开始处理 / 完成 / 删除，逻辑保持原样
      render: (item) => {
        const canStart = item.handle_status === 1;
        const canComplete = item.handle_status === 2;
        const canDelete = item.handle_status === 1;
        return (
          <div className="flex gap-1">
            {canStart && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => openStartDialog(item)}
              >
                {t('startHandle')}
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => openCompleteDialog(item)}
              >
                {tc('complete')}
              </Button>
            )}
            {canDelete && (
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
        );
      },
    },
  ];

  return (
    <MainLayout title={t('unqualifiedProductHandling')}>
      {/* 部门/人员 datalist（可下拉选 + 可自由输入） */}
      <datalist id="deptList">
        {departments.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="personList">
        {persons.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('unqualifiedProductHandling')}</h1>
          <div className="flex gap-2 items-center">
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
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {t('addHandleOrder')}
            </Button>
            <GlobalExportToolbar
              filename={ts('k_erek5s')}
              title={ts('k_erek5s')}
              columns={[
                { key: 'handle_no', label: t('handleNo'), width: 18 },
                { key: 'material_code', label: tc('materialCode'), width: 15 },
                { key: 'material_name', label: tc('materialName'), width: 20 },
                { key: 'quantity', label: t('unqualifiedQty'), width: 10 },
                {
                  key: 'handle_type',
                  label: t('handlingMethod'),
                  width: 12,
                  formatter: (v) => (v ? t(typeMap[v] || '-') : '-'),
                },
                { key: 'responsible_dept', label: t('responsibleDept'), width: 12 },
                { key: 'responsible_person', label: t('responsiblePerson'), width: 12 },
                {
                  key: 'handle_status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => t(statusMap[v]?.label || '-'),
                },
              ]}
              data={selectedRows.length > 0 ? selectedRows : list}
            />
          </div>
        </div>        <StatsCards
          configs={[
            { key: 'pending', label: '待处理', icon: Clock, ...StatsTheme.orange },
            { key: 'processing', label: '处理中', icon: Wrench, ...StatsTheme.blue },
            { key: 'processed', label: '已处理', icon: CheckCircle, ...StatsTheme.green },
            { key: 'closed', label: '已关闭', icon: Archive, ...StatsTheme.gray },
            { key: 'monthlyCount', label: '本月不合格数', icon: XCircle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'processing', count: stats.processing },
            { key: 'processed', count: stats.processed },
            { key: 'closed', count: stats.closed },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <Card>
          <CardContent className="p-0">
            <StandardTable<Item>
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
              emptyText={tc('noRecords')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>
                {actionMode === 'create' && t('addUnqualifiedOrder')}
                {actionMode === 'start' && t('startHandle')}
                {actionMode === 'complete' && tc('complete')}
              </DialogTitle>
            </DialogHeader>
            {actionMode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('inspectionNo')} *</Label>
                  <Select
                    value={editItem.inspection_id ? String(editItem.inspection_id) : ''}
                    onValueChange={handleSelectInspection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tc('pleaseSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      {inspections.map((ins) => (
                        <SelectItem key={ins.id} value={String(ins.id)}>
                          {`${ins.inspection_no} | ${ins.material_code} ${ins.material_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('defectType')} *</Label>
                  <Input
                    value={editItem.defect_type || ''}
                    onChange={(e) => setEditItem({ ...editItem, defect_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{tc('materialCode')} *</Label>
                  <Input
                    value={editItem.material_code || ''}
                    onChange={(e) => setEditItem({ ...editItem, material_code: e.target.value })}
                    aria-invalid={materialValid === 'invalid'}
                    className={materialValid === 'invalid' ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30' : ''}
                  />
                  {materialValid === 'invalid' && editItem.material_code && (
                    <p className="mt-1 text-xs text-red-500">{tc('materialNotFound', { code: editItem.material_code })}</p>
                  )}
                </div>
                <div>
                  <Label>{tc('materialName')}</Label>
                  <Input
                    value={editItem.material_name || ''}
                    onChange={(e) => setEditItem({ ...editItem, material_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('unqualifiedQty')} *</Label>
                  <Input
                    type="number"
                    value={editItem.quantity || ''}
                    onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('handlingMethod')}</Label>
                  <Select
                    value={String(editItem.handle_type || 1)}
                    onValueChange={(v) => setEditItem({ ...editItem, handle_type: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('rework')}</SelectItem>
                      <SelectItem value="2">{t('scrap')}</SelectItem>
                      <SelectItem value="3">{t('concessionAccept')}</SelectItem>
                      <SelectItem value="4">{t('return')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('responsibleDept')}</Label>
                  <Input
                    list="deptList"
                    value={editItem.responsible_dept || ''}
                    onChange={(e) => setEditItem({ ...editItem, responsible_dept: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('responsiblePerson')}</Label>
                  <Input
                    list="personList"
                    value={editItem.responsible_person || ''}
                    onChange={(e) =>
                      setEditItem({ ...editItem, responsible_person: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {actionMode === 'start' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>{t('handlingMethod')} *</Label>
                  <Select
                    value={String(startForm.handle_type)}
                    onValueChange={(v) => setStartForm({ ...startForm, handle_type: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('rework')}</SelectItem>
                      <SelectItem value="2">{t('scrap')}</SelectItem>
                      <SelectItem value="3">{t('concessionAccept')}</SelectItem>
                      <SelectItem value="4">{t('return')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('responsibleDept')} *</Label>
                  <Input
                    list="deptList"
                    value={startForm.responsible_dept}
                    onChange={(e) =>
                      setStartForm({ ...startForm, responsible_dept: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{t('responsiblePerson')} *</Label>
                  <Input
                    list="personList"
                    value={startForm.responsible_person}
                    onChange={(e) =>
                      setStartForm({ ...startForm, responsible_person: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {actionMode === 'complete' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>{t('handler') || 'Handler'} *</Label>
                  <Input
                    list="personList"
                    value={completeForm.handler}
                    onChange={(e) => setCompleteForm({ ...completeForm, handler: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('handleResult') || 'Result'} *</Label>
                  <Select
                    value={String(completeForm.handle_result)}
                    onValueChange={(v) =>
                      setCompleteForm({ ...completeForm, handle_result: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{tc('qualified') || 'Qualified'}</SelectItem>
                      <SelectItem value="2">{tc('unqualified') || 'Unqualified'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('costAmount') || 'Cost Amount'} *</Label>
                  <Input
                    type="number"
                    value={completeForm.cost_amount}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, cost_amount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
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
