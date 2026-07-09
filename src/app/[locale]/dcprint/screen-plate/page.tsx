'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, History, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface ScreenPlate {
  id: number;
  plate_code: string;
  plate_name: string;
  plate_type: number;
  mesh_count: string;
  mesh_material: string;
  size: string;
  tension_value: number;
  frame_type: string;
  customer_id: number;
  customer_name: string;
  max_use_count: number;
  life_count: number;
  remaining_count: number;
  reclaim_count: number;
  status: number;
  warehouse_name: string;
  location_name: string;
  storage_location: string;
  scrap_reason: string;
  exposure_date: string;
  last_used_date: string;
  last_clean_date: string;
  last_reclaim_date: string;
  tension_date: string;
  remark: string;
  create_time: string;
}

interface HistoryRecord {
  id: number;
  screen_plate_id: number;
  action: string;
  tension_value: number;
  life_increment: number;
  remark: string;
  operator_name: string;
  created_at: string;
}

const typeMap: Record<number, string> = {
  1: tc('text_c267o'),
  2: tc('text_jatse'),
  3: tc('text_iad0'),
  4: tc('text_ekj3'),
};
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: tc('text_hqx2'), variant: 'default' },
  2: { label: tc('text_ex3t'), variant: 'default' },
  3: { label: tc('text_e9bb2'), variant: 'secondary' },
  4: { label: tc('text_hjdtx'), variant: 'default' },
  5: { label: tc('text_gn457'), variant: 'outline' },
  6: { label: tc('text_e5vvo'), variant: 'secondary' },
  7: { label: tc('text_hdqo'), variant: 'destructive' },
  8: { label: tc('text_e8o3w'), variant: 'destructive' },
};
const actionMap: Record<string, string> = {
  Created: tc('text_ehj3'),
  Exposed: tc('text_hxxo'),
  Printed: tc('text_en5z'),
  Cleaned: tc('text_jb8y'),
  Reclaimed: tc('text_eiia'),
  Scrapped: tc('text_haqi'),
  TensionAdjusted: tc('text_ccpaq4'),
};

export default function ScreenPlatePage() {
  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<ScreenPlate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ScreenPlate>>({});
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [currentPlateId, setCurrentPlateId] = useState<number | null>(null);
  const [lifeAction, setLifeAction] = useState('');
  const [lifeRemark, setLifeRemark] = useState('');
  const [lifeTension, setLifeTension] = useState('');
  const [lifeIncrement, setLifeIncrement] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchCode) params.set('plateCode', searchCode);
      if (searchStatus) params.set('status', searchStatus);
      const res = await authFetch('/api/screen-plates?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchHistory = async (plateId: number) => {
    try {
      const res = await authFetch(`/api/screen-plates/history?plateId=${plateId}`);
      const result = await res.json();
      if (result.success) {
        setHistoryList(result.data || []);
      }
    } catch {}
  };

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/screen-plates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editItem, operatorName: '系统' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? '更新成功' : '创建成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await authFetch('/api/screen-plates?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchData();
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  const handleViewHistory = async (id: number) => {
    setCurrentPlateId(id);
    await fetchHistory(id);
    setShowHistoryDialog(true);
  };

  const handleAddLifeRecord = async () => {
    if (!currentPlateId || !lifeAction) {
      toast({ title: '请选择操作类型', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/screen-plates/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateId: currentPlateId,
          action: lifeAction,
          tensionValue: lifeTension ? parseFloat(lifeTension) : undefined,
          lifeIncrement: lifeIncrement ? parseInt(lifeIncrement) : 0,
          remark: lifeRemark,
          operatorName: '系统',
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '记录成功' });
        setLifeAction('');
        setLifeRemark('');
        setLifeTension('');
        setLifeIncrement('');
        fetchHistory(currentPlateId);
        fetchData();
      } else {
        toast({ title: '失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '失败', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('text_gjfp3w')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('code')}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Select value={searchStatus} onValueChange={setSearchStatus}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tc('all')}</SelectItem>
                  {Object.entries(statusMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
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
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tc('text_d7bmo5')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('text_gjgb2a')}</TableHead>
                  <TableHead className="text-xs">{tc('text_gj8zx6')}</TableHead>
                  <TableHead className="text-xs">{tc('type')}</TableHead>
                  <TableHead className="text-xs">{tc('text_ksaq')}</TableHead>
                  <TableHead className="text-xs">{tc('size')}</TableHead>
                  <TableHead className="text-xs">{tc('customer')}</TableHead>
                  <TableHead className="text-xs">{tc('text_qylaao')}</TableHead>
                  <TableHead className="text-xs">{tc('text_aryty9')}</TableHead>
                  <TableHead className="text-xs">{tc('text_gmt7')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  const warn = item.remaining_count <= item.max_use_count * 0.2;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.plate_code}</TableCell>
                      <TableCell className="text-xs">{item.plate_name}</TableCell>
                      <TableCell className="text-xs">{typeMap[item.plate_type] || '-'}</TableCell>
                      <TableCell className="text-xs">{item.mesh_count || '-'}</TableCell>
                      <TableCell className="text-xs">{item.size || '-'}</TableCell>
                      <TableCell className="text-xs">{item.customer_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {warn ? (
                          <span className="text-red-500 font-bold">
                            {item.life_count}/{item.max_use_count}
                          </span>
                        ) : (
                          `${item.life_count}/${item.max_use_count}`
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.reclaim_count || 0}</TableCell>
                      <TableCell className="text-xs">
                        {item.tension_value ? `${item.tension_value} N/cm` : '-'}
                      </TableCell>
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
                            title={tc('edit')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleViewHistory(item.id)}
                            title="生命周期"
                          >
                            <History className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleDelete(item.id)}
                            title={tc('delete')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                      {tc('text_dd1mmb')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {tc('text_g35')}
            {total}
            {tc('text_kf5')}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('text_btlof')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('text_btmf4')}
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? '编辑网版' : '新增网版'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('text_gjgb2a')}</Label>
                <Input
                  value={editItem.plate_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, plate_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_gj8zx6')}</Label>
                <Input
                  value={editItem.plate_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, plate_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('type')}</Label>
                <Select
                  value={String(editItem.plate_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, plate_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('text_c267o')}</SelectItem>
                    <SelectItem value="2">{tc('text_jatse')}</SelectItem>
                    <SelectItem value="3">{tc('text_iad0')}</SelectItem>
                    <SelectItem value="4">{tc('text_ekj3')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('text_ksaq')}</Label>
                <Input
                  value={editItem.mesh_count || ''}
                  onChange={(e) => setEditItem({ ...editItem, mesh_count: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_adu9bg')}</Label>
                <Input
                  value={editItem.mesh_material || ''}
                  onChange={(e) => setEditItem({ ...editItem, mesh_material: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('size')}</Label>
                <Input
                  value={editItem.size || ''}
                  onChange={(e) => setEditItem({ ...editItem, size: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_fvhh2')}</Label>
                <Input
                  value={editItem.frame_type || ''}
                  onChange={(e) => setEditItem({ ...editItem, frame_type: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('text_tt1rt5')}</Label>
                <Input
                  type="number"
                  value={editItem.tension_value ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, tension_value: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{tc('text_cxnt0h')}</Label>
                <Input
                  type="number"
                  value={editItem.max_use_count ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, max_use_count: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <Select
                  value={String(editItem.status ?? 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{tc('text_bxzajr')}</Label>
                <Input
                  value={editItem.storage_location || ''}
                  onChange={(e) => setEditItem({ ...editItem, storage_location: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('text_ev02')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl" resizable>
            <DialogHeader>
              <DialogTitle>{tc('text_p82rm7')}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">{tc('text_aw7utt')}</TabsTrigger>
                <TabsTrigger value="add">{tc('text_d7dmoj')}</TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{tc('text_d1x8m7')}</TableHead>
                      <TableHead className="text-xs">{tc('text_ec2zl')}</TableHead>
                      <TableHead className="text-xs">{tc('text_byix7k')}</TableHead>
                      <TableHead className="text-xs">{tc('remark')}</TableHead>
                      <TableHead className="text-xs">{tc('text_f5g8b')}</TableHead>
                      <TableHead className="text-xs">{tc('time')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyList.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">
                          <Badge variant="outline">{actionMap[h.action] || h.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {h.tension_value ? `${h.tension_value} N/cm` : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {h.life_increment > 0 ? h.life_increment : '-'}
                        </TableCell>
                        <TableCell className="text-xs">{h.remark || '-'}</TableCell>
                        <TableCell className="text-xs">{h.operator_name || '-'}</TableCell>
                        <TableCell className="text-xs">{h.created_at}</TableCell>
                      </TableRow>
                    ))}
                    {historyList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                          {tc('text_dd1mmb')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="add">
                <div className="space-y-4">
                  <div>
                    <Label>{tc('text_d1x8m7')}</Label>
                    <Select value={lifeAction} onValueChange={setLifeAction}>
                      <SelectTrigger>
                        <SelectValue placeholder={tc('pleaseSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(actionMap).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{tc('text_6he839')}</Label>
                    <Input
                      type="number"
                      value={lifeTension}
                      onChange={(e) => setLifeTension(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{tc('text_ecll9t')}</Label>
                    <Input
                      type="number"
                      value={lifeIncrement}
                      onChange={(e) => setLifeIncrement(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{tc('remark')}</Label>
                    <Textarea value={lifeRemark} onChange={(e) => setLifeRemark(e.target.value)} />
                  </div>
                  <Button onClick={handleAddLifeRecord}>
                    <Activity className="h-3 w-3 mr-1" />
                    {tc('text_cxej5l')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
