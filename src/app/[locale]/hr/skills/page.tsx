'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, Star, CheckCircle2, XCircle, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

interface Skill {
  id: number;
  employee_id: number;
  employee_name: string;
  skill_code: string;
  skill_name: string;
  skill_category: string;
  skill_level: number;
  certified: number;
  assessor: string;
  assess_date: string;
  next_assess_date: string;
  remark: string;
}

const categoryMap: Record<string, string> = {
  '印刷技术': 'skillCategoryPrinting',
  '后加工': 'skillCategoryBinding',
  '模切技术': 'skillCategoryDieCutting',
  '质量管理': 'skillCategoryQuality',
  '模具技术': 'skillCategoryMold',
  management: 'skillCategoryManagement',
  printing: 'skillCategoryPrinting',
  quality: 'skillCategoryQuality',
  maintenance: 'skillCategoryMaintenance',
  business: 'skillCategoryBusiness',
};

const categoryOptions = [
  { value: '_all', label: 'all' },
  { value: '印刷技术', label: 'skillCategoryPrinting' },
  { value: '后加工', label: 'skillCategoryBinding' },
  { value: '模切技术', label: 'skillCategoryDieCutting' },
  { value: '质量管理', label: 'skillCategoryQuality' },
  { value: '模具技术', label: 'skillCategoryMold' },
  { value: 'maintenance', label: 'skillCategoryMaintenance' },
  { value: 'business', label: 'skillCategoryBusiness' },
];

const levelLabels = ['', 'skillLevel1', 'skillLevel2', 'skillLevel3', 'skillLevel4', 'skillLevel5'];


export default function SkillsPage() {
  const [list, setList] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [employeeId, setEmployeeId] = useState('');
  const [skillCategory, setSkillCategory] = useState('_all');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Skill>>({});

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = selectedRows;
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/hr/skills?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    fetchData();
  };

  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (employeeId) params.append('employeeId', employeeId);
      if (skillCategory && skillCategory !== '_all') params.append('skillCategory', skillCategory);

      const res = await authFetch(`/api/hr/skills?${params}`);
      const json = await res.json();
      if (json.code === 200) {
        setList(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      toast({ title: tc('error'), description: tc('fetchFailed'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    try {
      const isEdit = !!editItem.id;
      const res = await authFetch('/api/hr/skills', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(editItem),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast({ title: tc('success'), description: isEdit ? tc('updateSuccess') : tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: json.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/hr/skills?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast({ title: tc('success'), description: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: json.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const renderStars = (level: number) => {
    return (
      <span className="inline-flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </span>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns: StandardTableColumn<Skill>[] = [
    { key: 'employee_name', title: t('employeeName'), render: (row) => row.employee_name },
    { key: 'skill_name', title: t('skillName'), render: (row) => <span className="font-medium">{row.skill_name}</span> },
    { key: 'skill_category', title: t('skillCategory'), render: (row) => t(categoryMap[row.skill_category] || row.skill_category) },
    {
      key: 'skill_level',
      title: t('skillLevel'),
      render: (row) => (
        <div className="flex items-center gap-2">
          {renderStars(row.skill_level)}
          <span className="text-muted-foreground text-xs">{t(levelLabels[row.skill_level])}</span>
        </div>
      ),
    },
    {
      key: 'certified',
      title: t('certified'),
      render: (row) =>
        row.certified ? (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('certified')}
          </Badge>
        ) : (
          <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs border-0">
            <XCircle className="h-3 w-3 mr-1" />
            {tc('no')}
          </Badge>
        ),
    },
    { key: 'assessor', title: t('assessor'), render: (row) => row.assessor || '-' },
    { key: 'next_assess_date', title: t('nextAssessDate'), render: (row) => formatDate(row.next_assess_date) },
    {
      key: 'actions',
      title: tc('operation'),
      align: 'right',
      width: 100,
      render: (row) => (
        <div className="flex gap-1 justify-end">
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
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout title={t('skillMatrix')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('skillMatrix')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('employeeId')}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Select value={skillCategory} onValueChange={setSkillCategory}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder={t('skillCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === '_all' ? tc('all') : t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({ skill_level: 1, certified: 0 });
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tc('add')}
            </Button>
          </div>
        </div>

        
        {/* 统计卡片 */}
        <StatsCards
          configs={[
            { key: 'total', label: '技能总数', icon: Award, ...StatsTheme.blue },
            { key: 'level1', label: '初级', icon: Star, ...StatsTheme.gray },
            { key: 'level2', label: '中级', icon: Star, ...StatsTheme.cyan },
            { key: 'level3', label: '高级', icon: Star, ...StatsTheme.orange }
          ]}
          stats={[
            { key: 'total', count: list.length },
            { key: 'level1', count: list.length },
            { key: 'level2', count: list.length },
            { key: 'level3', count: list.length }
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />
<Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable<Skill>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              showPagination={totalPages > 1}
              onPageChange={setPage}
              rowSelectable
              selectedRows={list.filter((r) => selectedRows.includes(r.id))}
              onRowSelectedChange={(rows) => setSelectedRows(rows.map((r) => r.id))}
              rowKey="id"
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? tc('edit') : tc('add')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('employeeNo')}</Label>
                <Input
                  type="number"
                  value={editItem.employee_id || ''}
                  onChange={(e) => setEditItem({ ...editItem, employee_id: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('skillCode')}</Label>
                <Input
                  value={editItem.skill_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, skill_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('skillName')}</Label>
                <Input
                  value={editItem.skill_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, skill_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('skillCategory')}</Label>
                <Select
                  value={editItem.skill_category || ''}
                  onValueChange={(v) => setEditItem({ ...editItem, skill_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="printing">{t('skillCategoryPrinting')}</SelectItem>
                    <SelectItem value="binding">{t('skillCategoryBinding')}</SelectItem>
                    <SelectItem value="finishing">{t('skillCategoryFinishing')}</SelectItem>
                    <SelectItem value="maintenance">{t('skillCategoryMaintenance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('skillLevel')}</Label>
                <Select
                  value={String(editItem.skill_level || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, skill_level: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <SelectItem key={lv} value={String(lv)}>
                        {lv} - {t(levelLabels[lv])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('certified')}</Label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    checked={!!editItem.certified}
                    onChange={(e) => setEditItem({ ...editItem, certified: e.target.checked ? 1 : 0 })}
                  />
                  <span className="text-sm text-muted-foreground">{editItem.certified ? t('certified') : tc('no')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('assessor')}</Label>
                <Input
                  value={editItem.assessor || ''}
                  onChange={(e) => setEditItem({ ...editItem, assessor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('assessDate')}</Label>
                <Input
                  type="date"
                  value={editItem.assess_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, assess_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('nextAssessDate')}</Label>
                <Input
                  type="date"
                  value={editItem.next_assess_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, next_assess_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                  rows={3}
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
