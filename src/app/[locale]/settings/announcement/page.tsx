'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Megaphone, Plus, RefreshCw, Eye, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  priority: number;
  is_top: number;
  publish_time: string | null;
  expire_time: string | null;
  creator_name: string;
  read_count: number;
  is_read: number;
  create_time: string;
}

export default function AnnouncementPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [list, setList] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 0,
    is_top: false,
    expire_time: '',
    status: 'draft' as 'draft' | 'published',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/system/announcement?type=all&page=${page}&pageSize=20`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast({ title: '标题和内容不能为空', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/system/announcement', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '公告创建成功' });
        setCreateOpen(false);
        setForm({
          title: '',
          content: '',
          type: 'info',
          priority: 0,
          is_top: false,
          expire_time: '',
          status: 'draft',
        });
        fetchData();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handlePublish = async (id: number) => {
    try {
      const res = await authFetch('/api/system/announcement', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'publish' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '公告已发布' });
        fetchData();
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此公告？')) return;
    try {
      const res = await authFetch(`/api/system/announcement?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '公告已删除' });
        fetchData();
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const viewDetail = (item: Announcement) => {
    setCurrentItem(item);
    setViewOpen(true);
    // 标记已读
    authFetch('/api/system/announcement', {
      method: 'PUT',
      body: JSON.stringify({ id: item.id, action: 'read' }),
    });
  };

  const typeMap: Record<string, { label: string; color: string }> = {
    info: { label: '通知', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    warning: {
      label: '警告',
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    },
    important: {
      label: '重要',
      color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    },
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" />
              {t('announcementManagement')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('announcementManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {tc('refresh')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
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
                  <TableHead className="w-[40%]">{tc('title') || '标题'}</TableHead>
                  <TableHead>{tc('type')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('text_mifc')}</TableHead>
                  <TableHead>{tc('text_mnnqx')}</TableHead>
                  <TableHead>{tc('text_ayuphs')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!item.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          <span className="font-medium text-sm">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeMap[item.type]?.color || typeMap['info'].color}>
                          {typeMap[item.type]?.label || item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'published' ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                            {tc('text_e656s')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{tc('draft')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.is_top ? '是' : '-'}</TableCell>
                      <TableCell className="text-sm">{item.read_count}</TableCell>
                      <TableCell className="text-xs">{item.publish_time || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => viewDetail(item)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {tc('text_ibpi')}
                          </Button>
                          {item.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-green-600"
                              onClick={() => handlePublish(item.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {tc('text_erte')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tc('total')} {total}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage') || '上一页'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage') || '下一页'}
            </Button>
          </div>
        </div>
      </div>

      {/* 创建公告对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tc('text_ar49nh')}</DialogTitle>
            <DialogDescription>{tc('text_7tfy1j')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{tc('text_dqp6wr')}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_anl1i6')}</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{tc('type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{tc('notice')}</SelectItem>
                    <SelectItem value="warning">{tc('text_o690')}</SelectItem>
                    <SelectItem value="important">{tc('text_pjys')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{tc('priority')}</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{tc('text_ikg3cm')}</Label>
                <Input
                  type="datetime-local"
                  value={form.expire_time}
                  onChange={(e) => setForm((f) => ({ ...f, expire_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{tc('actions')}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: any) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{tc('text_v17vor')}</SelectItem>
                    <SelectItem value="published">{tc('text_ff4jlv')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看公告对话框 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentItem?.title}</DialogTitle>
            <DialogDescription>
              {currentItem?.creator_name} · {currentItem?.publish_time || currentItem?.create_time}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap">{currentItem?.content}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
