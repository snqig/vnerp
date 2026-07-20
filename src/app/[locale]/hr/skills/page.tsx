'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, Star, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
  printing: 'skillCategoryPrinting',
  binding: 'skillCategoryBinding',
  finishing: 'skillCategoryFinishing',
  maintenance: 'skillCategoryMaintenance',
};

const categoryOptions = [
  { value: '_all', label: 'all' },
  { value: 'printing', label: 'skillCategoryPrinting' },
  { value: 'binding', label: 'skillCategoryBinding' },
  { value: 'finishing', label: 'skillCategoryFinishing' },
  { value: 'maintenance', label: 'skillCategoryMaintenance' },
];

const levelLabels = ['', 'skillLevel1', 'skillLevel2', 'skillLevel3', 'skillLevel4', 'skillLevel5'];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
};

export default function SkillsPage() {
  const [list, setList] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [employeeId, setEmployeeId] = useState('');
  const [skillCategory, setSkillCategory] = useState('_all');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Skill>>({});

  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

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
      toast.error(tc('fetchFailed'));
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
        toast.success(isEdit ? tc('updateSuccess') : tc('createSuccess'));
        setShowDialog(false);
        fetchData();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/hr/skills?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(tc('deleteSuccess'));
        fetchData();
      } else {
        toast.error(json.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('employeeName')}</TableHead>
                  <TableHead className="text-xs">{t('skillName')}</TableHead>
                  <TableHead className="text-xs">{t('skillCategory')}</TableHead>
                  <TableHead className="text-xs">{t('skillLevel')}</TableHead>
                  <TableHead className="text-xs">{t('certified')}</TableHead>
                  <TableHead className="text-xs">{t('assessor')}</TableHead>
                  <TableHead className="text-xs">{t('nextAssessDate')}</TableHead>
                  <TableHead className="text-xs w-20">{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.employee_name}</TableCell>
                    <TableCell className="text-xs font-medium">{item.skill_name}</TableCell>
                    <TableCell className="text-xs">
                      {t(categoryMap[item.skill_category] || item.skill_category)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        {renderStars(item.skill_level)}
                        <span className="text-muted-foreground text-xs">
                          {t(levelLabels[item.skill_level])}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.certified ? (
                        <Badge className="bg-green-100 text-green-700 text-xs border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('certified')}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 text-xs border-0">
                          <XCircle className="h-3 w-3 mr-1" />
                          {tc('no')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{item.assessor || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(item.next_assess_date)}
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
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('totalRecords', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
               {tc('prevPage')}
            </Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">
              {page} / {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
               {tc('nextPage')}
            </Button>
          </div>
        </div>

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
                    className="h-4 w-4 rounded border-gray-300"
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
