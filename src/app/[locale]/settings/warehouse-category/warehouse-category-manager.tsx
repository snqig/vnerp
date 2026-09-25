'use client';
import { useTranslations } from 'next-intl';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Warehouse, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';

// 仓库分类接口
interface WarehouseCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  sort_order: number;
  status: number;
  warehouse_count?: number;
  active_warehouse_count?: number;
  create_time?: string;
  update_time?: string;
}

// 后端返回的编码规则与分析结果
interface CategoryRules {
  codePattern: string;
  codePatternDesc: string;
  enforceOnCreate: boolean;
  enforceOnUpdate: boolean;
}

interface CategoryAnalysis {
  emptyCategoryCount: number;
  invalidCodeCount: number;
}

// 统计数据接口
interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  totalWarehouses: number;
  activeWarehouses: number;
}

export function WarehouseCategoryManager() {
  const ts = useTranslations('Common');
  const tc = useTranslations('Common');
  const [categories, setCategories] = useState<WarehouseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<WarehouseCategory>>({});
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<CategoryStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalWarehouses: 0,
    activeWarehouses: 0,
  });
  const [codeError, setCodeError] = useState('');
  const [rules, setRules] = useState<CategoryRules | null>(null);
  const [analysis, setAnalysis] = useState<CategoryAnalysis>({
    emptyCategoryCount: 0,
    invalidCodeCount: 0,
  });

  // 生成唯一仓库分类编码
  // 需同时识别库中并存的两种形态（种子数据 WHCAT001 与历史码 WH-CAT-001），
  // 并沿用种子数据的主流形态 WHCAT + 3 位数字，避免新码与存量形态不一致。
  const generateCategoryCode = () => {
    let maxNum = 0;
    categories.forEach((c) => {
      if (!c.code) return;
      const match = c.code.match(/^(?:WHCAT|WH-CAT-?)(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    let counter = maxNum + 1;
    let newCode = `WHCAT${String(counter).padStart(3, '0')}`;

    // 再次检查是否已存在（防止数据库中有但前端未加载的数据）
    const existingCodes = categories.map((c) => c.code);
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = `WHCAT${String(counter).padStart(3, '0')}`;
    }

    return newCode;
  };

  // 检查仓库分类编码是否重复
  const checkCodeDuplicate = (code: string, excludeId?: number) => {
    return categories.some((c) => c.code === code && c.id !== excludeId);
  };

  // 获取仓库分类列表（带统计）
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/organization/warehouse-category/stats');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data.categories);
        setStats({
          total: result.data.summary.total_categories,
          active: result.data.summary.active_categories,
          inactive: result.data.summary.total_categories - result.data.summary.active_categories,
          totalWarehouses: result.data.summary.total_warehouses,
          activeWarehouses: result.data.summary.active_warehouses,
        });
        setRules(result.data.rules ?? null);
        setAnalysis({
          emptyCategoryCount: result.data.analysis?.emptyCategoryCount ?? 0,
          invalidCodeCount: result.data.analysis?.invalidCodeCount ?? 0,
        });
      }
    } catch {
      toast.error(tc('categoryFetchFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存仓库分类
  const saveCategory = async () => {
    if (!form.code || !form.code.trim()) {
      toast.error(tc('categoryCodeRequired'));
      return;
    }
    if (!form.name || !form.name.trim()) {
      toast.error(tc('categoryNameRequired'));
      return;
    }

    // 检查编码重复
    if (checkCodeDuplicate(form.code, form.id)) {
      setCodeError(tc('categoryCodeExists'));
      toast.error(tc('categoryCodeExists'));
      return;
    }

    try {
      const method = editing ? 'PUT' : 'POST';
      const requestBody = {
        id: form.id,
        code: form.code,
        name: form.name,
        description: form.description,
        sort_order: form.sort_order || 0,
        status: form.status ?? 1,
      };

      const response = await authFetch('/api/organization/warehouse-category', {
        method,
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editing ? tc('categoryUpdated') : tc('categoryCreated'));
        setDialogOpen(false);
        setCodeError('');
        fetchCategories();
      } else if (result.message === ts('k_l7bdt7') && !editing) {
        // 如果是新增且编码已存在，自动尝试下一个编码
        toast.error(tc('codeExistsUseGenerate'));
        setCodeError(tc('codeExistsRegenerate'));
      } else {
        toast.error(result.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(tc('saveFailed'));
    }
  };

  // 删除仓库分类
  const deleteCategory = async (id: number) => {
    if (!window.confirm(tc('confirmDeleteWarehouseCategory'))) return;
    try {
      const response = await authFetch(`/api/organization/warehouse-category?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success(tc('categoryDeleted'));
        fetchCategories();
      } else {
        toast.error(result.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状态标签
  const getStatusBadge = (status: number) => {
    return status === 1 ? (
      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">{ts('k_5pm2ma')}</Badge>
    ) : (
      <Badge className="bg-secondary text-secondary-foreground">{ts('k_6q9o5l')}</Badge>
    );
  };

  // 编码是否合规（后端用同一份规则判定，这里只做展示）
  const isCodeCompliant = (code: string) => {
    if (!rules?.codePattern) return true;
    try {
      return new RegExp(rules.codePattern).test(code);
    } catch {
      return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCards
        configs={[
          { key: 'total', label: ts('k_1s6ted3'), icon: Warehouse, ...StatsTheme.blue },
          { key: 'active', label: ts('k_lksp1x'), icon: Package, ...StatsTheme.green },
          { key: 'totalWarehouses', label: ts('k_rsrzqg'), icon: Warehouse, ...StatsTheme.purple },
          { key: 'activeWarehouses', label: ts('k_aofusw'), icon: Package, ...StatsTheme.orange },
        ]}
        stats={[
          { key: 'total', count: stats.total },
          { key: 'active', count: stats.active },
          { key: 'totalWarehouses', count: stats.totalWarehouses },
          { key: 'activeWarehouses', count: stats.activeWarehouses },
        ]}
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
      />


      {/* 分类列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              {ts('k_1tv860z')}</CardTitle>
            <CardDescription>{ts('k_9sn6xi')}</CardDescription>
          </div>
          <Button
            onClick={async () => {
              // 如果数据未加载，先加载数据
              if (categories.length === 0 && !loading) {
                await fetchCategories();
              }
              // 重新生成编码（使用最新数据）
              const newCode = generateCategoryCode();
              setForm({ code: newCode, name: '', status: 1, sort_order: categories.length + 1 });
              setEditing(false);
              setCodeError('');
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {ts('k_1gcuiks')}</Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {rules?.codePatternDesc && (
              <span>{tc('warehouseCategoryCodeRule', { rule: rules.codePatternDesc })}</span>
            )}
            {analysis.emptyCategoryCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {tc('warehouseCategoryEmptyCount', { count: analysis.emptyCategoryCount })}
              </span>
            ) : (
              <span>{tc('warehouseCategoryAllMounted')}</span>
            )}
            {analysis.invalidCodeCount > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {tc('warehouseCategoryInvalidCount', { count: analysis.invalidCodeCount })}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('categoryCode')}</TableHead>
                  <TableHead>{tc('categoryName')}</TableHead>
                  <TableHead>{tc('warehouseCount')}</TableHead>
                  <TableHead>{ts('k_dqvmz2')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="text-right">{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {ts('k_yr4lzo')}</TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-muted">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{category.code}</span>
                          {!isCodeCompliant(category.code) && (
                            <Badge variant="destructive" className="text-xs">
                              {tc('warehouseCategoryCodeInvalid')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">{category.name}</span>
                          {category.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            (category.warehouse_count || 0) > 0
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-400/15 dark:text-blue-400'
                              : 'bg-gray-100 text-muted-foreground'
                          }
                        >
                          {category.warehouse_count || 0}
                          {ts('k_1psqcaj')}
                        </Badge>
                      </TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>{getStatusBadge(category.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm(category);
                              setEditing(true);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategory(category.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? ts('k_jr18xd') : ts('k_1omehsy')}</DialogTitle>
            <DialogDescription>
              {editing ? ts('k_mldzz1') : ts('k_rby03q')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {tc('categoryCode')}<span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, code: value });

                      // 实时检测重复
                      if (value && checkCodeDuplicate(value, form.id)) {
                        setCodeError(tc('categoryCodeExists'));
                      } else {
                        setCodeError('');
                      }
                    }}
                    placeholder={ts('k_an4zi7')}
                    className={codeError ? 'border-red-500' : ''}
                  />
                  {!editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newCode = generateCategoryCode();
                        setForm({ ...form, code: newCode });
                        setCodeError('');
                      }}
                    >
                      {ts('k_3q0eu8')}</Button>
                  )}
                </div>
                {codeError && <p className="text-sm text-red-500 dark:text-red-400">{codeError}</p>}
              </div>
              <div className="space-y-2">
                <Label>
                  {tc('categoryName')}<span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={tc('categoryNameRequired')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{ts('k_1wnrlkr')}</Label>
              <Input
                type="number"
                value={form.sort_order || 0}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                placeholder={ts('k_1olh8rw')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('status')}</Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent"
                value={form.status ?? 1}
                onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
              >
                <option value={1}>{ts('k_5pm2ma')}</option>
                <option value={0}>{ts('k_6q9o5l')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{ts('k_jckxgh')}</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={ts('k_rml5ti')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} type="button">
              {tc('cancel')}</Button>
            <Button onClick={saveCategory} className="bg-blue-600 hover:bg-blue-700" type="button">
              {ts('k_1c3mapc')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
