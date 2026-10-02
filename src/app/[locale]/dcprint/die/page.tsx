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
import { Plus, Search, Edit, Trash2, Diamond, CheckCircle, Wrench, Circle, AlertTriangle } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Item {
  id: number;
  die_code: string;
  die_name: string;
  die_type: number;
  size_spec: string;
  product_name: string;
  max_use_count: number;
  used_count: number;
  remaining_count: number;
  status: number;
}
const typeMap: Record<number, string> = {
  1: '模切刀',
  2: '分切刀',
  3: '压痕刀',
  4: '冲孔刀',
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '在用', variant: 'default' },
  2: { label: '待保养', variant: 'outline' },
  3: { label: '保养中', variant: 'secondary' },
  4: { label: '已报废', variant: 'destructive' },
};

export default function DieManagementPage() {
  const ts = useTranslations('Dcprint');
  // 翻译钩子
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        dieCode: searchCode,
        dieName: searchName,
      });
      const res = await authFetch('/api/prepress/die?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch die list:', error);
      setList([]);
    }
  };
  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/prepress/die', {
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
      const res = await authFetch('/api/prepress/die?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  // 注：/api/prepress/die 暂不支持 sortField/sortDirection，故先不开启 sortable，
  // 避免出现点击无反应的排序控件；待后端补齐排序参数后再打开。
  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'die_code',
      title: ts('k_1kzim0h'),
      render: (r) => <span className="text-xs font-mono">{r.die_code}</span>,
    },
    { key: 'die_name', title: ts('k_1jwfah9'), render: (r) => <span className="text-xs">{r.die_name}</span> },
    { key: 'die_type', title: tc('type'), render: (r) => <span className="text-xs">{typeMap[r.die_type] || '-'}</span> },
    { key: 'size_spec', title: ts('k_ym4hcn'), render: (r) => <span className="text-xs">{r.size_spec || '-'}</span> },
    { key: 'product_name', title: tc('product'), render: (r) => <span className="text-xs">{r.product_name || '-'}</span> },
    {
      key: 'max_use_count',
      title: tc('dcMaxUseCountHead'),
      render: (r) => <span className="text-xs">{r.max_use_count}</span>,
    },
    { key: 'used_count', title: ts('k_y7lj0n'), render: (r) => <span className="text-xs">{r.used_count ?? 0}</span> },
    {
      key: 'remaining_count',
      title: tc('dcRemainingCountHead'),
      render: (r) => {
        const warn = r.remaining_count <= r.max_use_count * 0.2;
        return (
          <span className="text-xs">
            {warn ? (
              <span className="text-red-500 dark:text-red-400 font-bold">{r.remaining_count}</span>
            ) : (
              r.remaining_count
            )}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => {
        const st = statusMap[r.status] || statusMap[1];
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
      align: 'right',
      // 原有操作列：编辑 / 删除，逻辑保持原样
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditItem(r);
              setShowDialog(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(r.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalDies'), icon: Diamond, ...StatsTheme.blue },
            { key: 'active', label: tc('inUse'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'maintenance', label: tc('underMaintenance'), icon: Wrench, ...StatsTheme.orange },
            { key: 'scrapped', label: tc('scrapped'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'total', count: list.length },
            { key: 'active', count: list.filter((d) => d.status === 1).length },
            { key: 'maintenance', count: list.filter((d) => d.status === 2).length },
            { key: 'scrapped', count: list.filter((d) => d.status === 3).length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('dcDieMgmtTitle')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('code')}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Input
                placeholder={tc('name')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => { fetchData(); }}>
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
              {ts('k_1heh86i')}</Button>
          </div>
        </div>
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
              rowSelectable={false}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onRetry={fetchData}
              emptyText={ts('k_11itye0')}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? ts('k_agyftp') : ts('k_1heh86i')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ts('k_1kzim0h')}</Label>
                <Input
                  value={editItem.die_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, die_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1jwfah9')}</Label>
                <Input
                  value={editItem.die_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, die_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('type')}</Label>
                <Select
                  value={String(editItem.die_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, die_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{ts('k_m6mv6r')}</SelectItem>
                    <SelectItem value="2">{ts('k_p6ggtq')}</SelectItem>
                    <SelectItem value="3">{ts('k_193ex13')}</SelectItem>
                    <SelectItem value="4">{ts('k_92pje1')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_ym4hcn')}</Label>
                <Input
                  value={editItem.size_spec || ''}
                  onChange={(e) => setEditItem({ ...editItem, size_spec: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_11roe0')}</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_fc0ina')}</Label>
                <Input
                  type="number"
                  value={editItem.max_use_count ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, max_use_count: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
