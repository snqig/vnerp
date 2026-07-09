'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DictType {
  id: number;
  dict_name: string;
  dict_type: string;
  status: number;
  remark: string | null;
  items: DictData[];
}

interface DictData {
  id: number;
  dict_type: string;
  dict_label: string;
  dict_value: string;
  sort_order: number;
  status: number;
  remark: string | null;
}

export default function DictPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ dict_name: '', dict_type: '', status: 1, remark: '' });
  const [dataForm, setDataForm] = useState({
    dict_type: '',
    dict_label: '',
    dict_value: '',
    sort_order: 0,
    status: 1,
    remark: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/system/dict');
      const result = await res.json();
      if (result.success) {
        setDictTypes(result.data?.list || []);
        if (result.data?.list?.length > 0 && !selectedType) {
          setSelectedType(result.data.list[0]);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateType = async () => {
    if (!typeForm.dict_name || !typeForm.dict_type) {
      toast({ title: '请填写字典名称和编码', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/system/dict', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_type', ...typeForm }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '字典类型创建成功' });
        setTypeDialogOpen(false);
        setTypeForm({ dict_name: '', dict_type: '', status: 1, remark: '' });
        fetchData();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleCreateData = async () => {
    if (!dataForm.dict_label || !dataForm.dict_value) {
      toast({ title: '请填写字典标签和值', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/system/dict', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_data',
          dict_type: selectedType?.dict_type,
          dict_label: dataForm.dict_label,
          dict_value: dataForm.dict_value,
          sort_order: dataForm.sort_order,
          status: dataForm.status,
          remark: dataForm.remark,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '字典数据创建成功' });
        setDataDialogOpen(false);
        setDataForm({
          dict_type: '',
          dict_label: '',
          dict_value: '',
          sort_order: 0,
          status: 1,
          remark: '',
        });
        fetchData();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('确认删除此字典类型及其所有数据？')) return;
    try {
      const res = await authFetch(`/api/system/dict?action=delete_type&id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '字典类型已删除' });
        if (selectedType?.id === id) setSelectedType(null);
        fetchData();
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleDeleteData = async (id: number) => {
    if (!confirm('确认删除此字典数据？')) return;
    try {
      const res = await authFetch(`/api/system/dict?action=delete_data&id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '字典数据已删除' });
        fetchData();
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              {t('dictManagement')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('dictManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {tc('refresh')}
            </Button>
            <Button size="sm" onClick={() => setTypeDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              {t('addDictType')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* 左侧字典类型列表 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('dictType')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {dictTypes.map((dt) => (
                  <div
                    key={dt.id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedType?.id === dt.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedType(dt)}
                  >
                    <div>
                      <p className="text-sm font-medium">{dt.dict_name}</p>
                      <p className="text-xs text-muted-foreground">{dt.dict_type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {dt.items?.length || 0}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteType(dt.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 右侧字典数据 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    {selectedType?.dict_name || tc('selectDictType')}
                  </CardTitle>
                  {selectedType && (
                    <CardDescription className="text-xs">{selectedType.dict_type}</CardDescription>
                  )}
                </div>
                {selectedType && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDataForm((f) => ({ ...f, dict_type: selectedType.dict_type }));
                      setDataDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('addDictData')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {selectedType ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('dictLabel')}</TableHead>
                      <TableHead>{t('dictValue')}</TableHead>
                      <TableHead>{tc('sortOrder')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead className="text-right">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedType.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (selectedType.items || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-sm">{item.dict_label}</TableCell>
                          <TableCell className="text-sm font-mono">{item.dict_value}</TableCell>
                          <TableCell className="text-sm">{item.sort_order}</TableCell>
                          <TableCell>
                            {item.status === 1 ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                                {tc('enable')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{tc('disable')}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-red-600"
                              onClick={() => handleDeleteData(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">{tc('text_wxodgt')}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 创建字典类型对话框 */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addDictType')}</DialogTitle>
            <DialogDescription>{tc('createNewDictCategory')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{tc('dictName')} *</Label>
              <Input
                value={typeForm.dict_name}
                onChange={(e) => setTypeForm((f) => ({ ...f, dict_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('dictCode')} *</Label>
              <Input
                value={typeForm.dict_type}
                onChange={(e) => setTypeForm((f) => ({ ...f, dict_type: e.target.value }))}
                placeholder={tc('dictCodePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('remark')}</Label>
              <Textarea
                value={typeForm.remark}
                onChange={(e) => setTypeForm((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateType}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建字典数据对话框 */}
      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addDictData')}</DialogTitle>
            <DialogDescription>
              {tc('addDataForDict', { dictName: selectedType?.dict_name || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{tc('dictLabel')} *</Label>
              <Input
                value={dataForm.dict_label}
                onChange={(e) => setDataForm((f) => ({ ...f, dict_label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('dictValue')} *</Label>
              <Input
                value={dataForm.dict_value}
                onChange={(e) => setDataForm((f) => ({ ...f, dict_value: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('sortOrder')}</Label>
              <Input
                type="number"
                value={dataForm.sort_order}
                onChange={(e) => setDataForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('remark')}</Label>
              <Textarea
                value={dataForm.remark}
                onChange={(e) => setDataForm((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDataDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateData}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
