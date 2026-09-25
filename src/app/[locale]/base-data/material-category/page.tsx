'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  ChevronRight,
  ChevronDown,
  CornerDownRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  category_code: string;
  category_name: string;
  parent_id: number | null;
  category_type: number;
  sort_order: number;
  status: number;
  remark: string;
  is_splittable: number;
  typical_examples: string | null;
}

/** 后端随列表下发的分类规则（真相源是 sys_calc_param，见迁移 074） */
interface CategoryRules {
  code_pattern: string;
  code_pattern_desc: string;
  max_depth: number;
  enforce_on_create: boolean;
  enforce_on_update: boolean;
}

export default function MaterialCategoryPage() {
  const ts = useTranslations('Common');
  const t = useTranslations('MaterialCategory');
  const tc = useTranslations('Common');

  const typeMap: Record<number, string> = {
    1: t('rawMaterial'),
    2: t('semiFinished'),
    3: t('finished'),
    4: t('auxiliary'),
    5: t('packaging'),
    6: t('ink'),
    7: t('solvent'),
    8: t('screen'),
    9: t('blade'),
    10: t('equipmentParts'),
  };

  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [list, setList] = useState<Item[]>([]);
  const [keyword, setKeyword] = useState('');
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [parentItem, setParentItem] = useState<Item | null>(null);
  const [rules, setRules] = useState<CategoryRules | null>(null);
  const [codeError, setCodeError] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '500' });
      const res = await authFetch('/api/base-data/material-category?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        // 规则来自系统设置，前端只负责展示与即时提示，最终裁决仍在后端
        if (result.data.rules) setRules(result.data.rules as CategoryRules);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 一级 → 二级 分组（后端按 sort_order/id 排序，这里保持同一顺序） */
  const tree = useMemo(() => {
    // 12 个业务一级大类（C01–C12）排前，其余（如遗留的 CAT成品）殿后；组内保持 sort_order/id 顺序
    const rank = (code: string) => (/^C\d{2}$/.test(code) ? 0 : 1);
    const roots = list
      .filter((i) => !i.parent_id)
      .sort(
        (a, b) =>
          rank(a.category_code) - rank(b.category_code) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.id - b.id
      );
    const childrenOf = (id: number) => list.filter((i) => i.parent_id === id);
    const kw = keyword.trim().toLowerCase();
    const groups = roots.map((root) => ({ root, children: childrenOf(root.id) }));
    if (!kw) return groups;
    // 搜索：命中一级自身（编码/名称/典型品名）或任一子分类即保留
    return groups.filter(
      (g) =>
        g.root.category_code.toLowerCase().includes(kw) ||
        g.root.category_name.toLowerCase().includes(kw) ||
        (g.root.typical_examples || '').toLowerCase().includes(kw) ||
        g.children.some(
          (c) =>
            c.category_code.toLowerCase().includes(kw) ||
            c.category_name.toLowerCase().includes(kw)
        )
    );
  }, [list, keyword]);

  /** 子分类编码建议：C05 → C05-04（取现有最大序号 +1） */
  const suggestChildCode = (parent: Item) => {
    const nums = list
      .filter((i) => i.parent_id === parent.id)
      .map((i) => Number((i.category_code.split('-')[1] || '').trim()) || 0);
    const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `${parent.category_code}-${String(next).padStart(2, '0')}`;
  };

  const isSearching = keyword.trim().length > 0;
  const isExpanded = (id: number) => isSearching || !collapsed[id];

  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const setAllCollapsed = (value: boolean) => {
    const next: Record<number, boolean> = {};
    tree.forEach((g) => {
      next[g.root.id] = value;
    });
    setCollapsed(next);
  };

  /** 按系统设置的编码规则做即时校验；返回提示文案，null 表示通过 */
  const validateCode = (code: string, isEdit: boolean): string | null => {
    const value = (code || '').trim();
    if (!value) return ts('k_dmqzk5');
    if (!rules?.code_pattern) return null;
    let re: RegExp;
    try {
      re = new RegExp(rules.code_pattern);
    } catch {
      return null; // 规则本身配错了，交给后端处理，不误伤用户
    }
    if (re.test(value)) return null;
    const desc = rules.code_pattern_desc || rules.code_pattern;
    return isEdit
      ? `提示：编码不符合系统设置的规则（${desc}），可继续保存但建议整改`
      : `编码不符合系统设置的规则：${desc}`;
  };

  const openCreateRoot = () => {
    setEditItem({ parent_id: null, sort_order: list.filter((i) => !i.parent_id).length + 1 });
    setParentItem(null);
    setCodeError('');
    setShowDialog(true);
  };

  const openCreateChild = (parent: Item) => {
    setEditItem({
      parent_id: parent.id,
      category_code: suggestChildCode(parent),
      category_type: parent.category_type,
      sort_order: list.filter((i) => i.parent_id === parent.id).length + 1,
    });
    setParentItem(parent);
    setCodeError('');
    setShowDialog(true);
  };

  const openEdit = (item: Item, parent: Item | null) => {
    setEditItem(item);
    setParentItem(parent);
    setCodeError('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    const isEdit = Boolean(editItem.id);
    const codeMsg = validateCode(editItem.category_code || '', isEdit);
    // 新增按系统设置强制拦截；编辑仅提示，避免锁死存量不合规数据
    if (codeMsg && (!isEdit || rules?.enforce_on_update)) {
      setCodeError(codeMsg);
      toast({ title: ts('k_1bz34mu'), description: codeMsg, variant: 'destructive' });
      return;
    }
    setCodeError('');

    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/base-data/material-category', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        // 后端可能带回"编码不合规"之类的非阻断提示，不能吞掉
        const warnings: string[] = result.data?.warnings || [];
        toast({
          title: editItem.id ? ts('k_1795bzg') : ts('k_kiombh'),
          description: warnings.length > 0 ? warnings.join('；') : undefined,
        });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: ts('k_12db3qz'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_12db3qz'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(ts('k_sur0cu'))) return;
    try {
      const res = await authFetch('/api/base-data/material-category?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('k_1hlqs') });
        fetchData();
      } else {
        toast({ title: ts('k_12db3qz'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_12db3qz'), variant: 'destructive' });
    }
  };

  const rootCount = tree.length;
  const childCount = tree.reduce((sum, g) => sum + g.children.length, 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{t('materialCategory')}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('l1Category')} {rootCount} · {t('subCategory')} {childCount}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchCategoryPlaceholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-48 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAllCollapsed(false)}>
              {t('expandAll')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAllCollapsed(true)}>
              {t('collapseAll')}
            </Button>
            {hasPermission('base-data:material-category:create') && (
              <Button size="sm" onClick={openCreateRoot}>
                <Plus className="h-3 w-3 mr-1" />
                {t('addCategory')}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-40">{tc('categoryCode')}</TableHead>
                  <TableHead className="text-xs w-56">{tc('categoryName')}</TableHead>
                  <TableHead className="text-xs">{t('typicalExamples')}</TableHead>
                  <TableHead className="text-xs w-20">{t('splittable')}</TableHead>
                  <TableHead className="text-xs w-20">{tc('status')}</TableHead>
                  <TableHead className="text-xs w-32">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tree.map(({ root, children }) => (
                  <Fragment key={root.id}>
                    <TableRow className="bg-muted/40 hover:bg-muted/60">
                      <TableCell className="text-xs font-mono font-medium">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-accent disabled:opacity-40"
                            disabled={children.length === 0}
                            onClick={() => toggleCollapse(root.id)}
                            aria-label={root.category_code}
                          >
                            {isExpanded(root.id) ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span>{root.category_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span>{root.category_name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {children.length}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {typeMap[root.category_type] || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">
                        <span className="line-clamp-2" title={root.typical_examples || ''}>
                          {root.typical_examples || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={root.is_splittable === 1}
                          disabled
                          aria-label={t('splittable')}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={root.status === 1 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {root.status === 1 ? tc('enabled') : tc('disabled')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title={t('editCategory')}
                            onClick={() => openEdit(root, null)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title={t('addSubCategory')}
                            onClick={() => openCreateChild(root)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(root.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded(root.id) &&
                      children.map((child) => (
                        <TableRow key={child.id} className="hover:bg-accent/40">
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            <div className="flex items-center gap-1 pl-5">
                              <CornerDownRight className="h-3 w-3 opacity-50" />
                              <span>{child.category_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{child.category_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                            {child.remark || '-'}
                          </TableCell>
                          <TableCell />
                          <TableCell>
                            <Badge
                              variant={child.status === 1 ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {child.status === 1 ? tc('enabled') : tc('disabled')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => openEdit(child, root)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                                onClick={() => handleDelete(child.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
                {tree.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>
                {editItem.id
                  ? t('editCategory')
                  : parentItem
                    ? t('addSubCategory')
                    : t('addCategory')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {parentItem && (
                <div className="col-span-2 rounded-lg bg-muted px-3 py-2 text-xs">
                  {t('l1Category')}：<span className="font-mono">{parentItem.category_code}</span>{' '}
                  {parentItem.category_name}
                </div>
              )}
              <div>
                <Label>{tc('categoryCode')}</Label>
                <Input
                  value={editItem.category_code || ''}
                  placeholder={rules?.code_pattern_desc || ''}
                  onChange={(e) => {
                    setEditItem({ ...editItem, category_code: e.target.value });
                    setCodeError(validateCode(e.target.value, Boolean(editItem.id)) || '');
                  }}
                />
                {codeError ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{codeError}</p>
                ) : rules?.code_pattern_desc ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ts('k_1cfdw8z')}
                    {rules.code_pattern_desc}
                  </p>
                ) : null}
              </div>
              <div>
                <Label>{tc('categoryName')}</Label>
                <Input
                  value={editItem.category_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, category_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('categoryType')}</Label>
                <Select
                  value={String(editItem.category_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, category_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('rawMaterial')}</SelectItem>
                    <SelectItem value="2">{tc('semiFinished')}</SelectItem>
                    <SelectItem value="3">{tc('finishedProduct')}</SelectItem>
                    <SelectItem value="4">{tc('auxiliaryMaterial')}</SelectItem>
                    <SelectItem value="5">{tc('packagingMaterial')}</SelectItem>
                    <SelectItem value="6">{tc('ink')}</SelectItem>
                    <SelectItem value="7">{tc('solvent')}</SelectItem>
                    <SelectItem value="8">{tc('screen')}</SelectItem>
                    <SelectItem value="9">{tc('tool')}</SelectItem>
                    <SelectItem value="10">{tc('equipmentPart')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('sortOrder')}</Label>
                <Input
                  type="number"
                  value={editItem.sort_order ?? 0}
                  onChange={(e) => setEditItem({ ...editItem, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('typicalExamples')}</Label>
                <Input
                  value={editItem.typical_examples || ''}
                  placeholder={t('typicalExamplesHint')}
                  onChange={(e) =>
                    setEditItem({ ...editItem, typical_examples: e.target.value })
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('typicalExamplesHint')}</p>
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
              {!parentItem && (
                <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>{t('splittable')}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">{t('splittableHint')}</p>
                  </div>
                  <Switch
                    checked={Number(editItem.is_splittable) === 1}
                    onCheckedChange={(v) => setEditItem({ ...editItem, is_splittable: v ? 1 : 0 })}
                  />
                </div>
              )}
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
