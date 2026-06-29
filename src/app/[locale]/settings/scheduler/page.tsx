'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, RefreshCw, Play, Pause, Plus, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

interface TaskItem {
  id: number;
  task_name: string;
  task_type: string;
  task_group: string;
  cron_expression: string | null;
  description: string | null;
  config: string | null;
  status: string;
  last_execute_time: string | null;
  last_result: string | null;
  create_by: number | null;
  create_time: string;
}

export default function SchedulerPage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [list, setList] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({
    task_name: '',
    task_type: 'inventory_alert',
    task_group: 'default',
    cron_expression: '',
    description: '',
    config: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/system/scheduler?page=${page}&pageSize=20`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!form.task_name || !form.task_type) {
      toast({ title: '请填写任务名称和类型', variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/system/scheduler', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '任务创建成功' });
        setCreateOpen(false);
        setForm({ task_name: '', task_type: 'inventory_alert', task_group: 'default', cron_expression: '', description: '', config: '' });
        fetchData();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string) => {
    try {
      const res = await authFetch('/api/system/scheduler', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: result.message || '操作成功' });
        fetchData();
      } else {
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const viewLogs = async (taskId: number) => {
    try {
      const res = await authFetch(`/api/system/scheduler?taskId=${taskId}&type=logs`);
      const result = await res.json();
      if (result.success) {
        setLogs(result.data?.logs || []);
        setLogOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const taskTypeMap: Record<string, string> = {
    'inventory_alert': '库存预警',
    'data_cleanup': '数据清理',
    'report_generation': '报表生成',
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              {t('schedulerManagement')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('schedulerManagementDesc')}
            </p>
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
                  <TableHead>{t('taskName')}</TableHead>
                  <TableHead>{t('taskType')}</TableHead>
                  <TableHead>{t('taskGroup')}</TableHead>
                  <TableHead>Cron</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('lastExecuteTime')}</TableHead>
                  <TableHead>{t('lastResult')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.task_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{taskTypeMap[item.task_type] || item.task_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.task_group || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cron_expression || '-'}</TableCell>
                      <TableCell>
                        {item.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                            {t('active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('paused')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.last_execute_time || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{item.last_result || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => handleAction(item.id, 'execute')}>
                            <Play className="h-3 w-3 mr-1" />
                            {t('execute')}
                          </Button>
                          {item.status === 'active' ? (
                            <Button size="sm" variant="ghost" className="h-7 text-yellow-600" onClick={() => handleAction(item.id, 'pause')}>
                              <Pause className="h-3 w-3 mr-1" />
                              {t('pause')}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => handleAction(item.id, 'resume')}>
                              <Play className="h-3 w-3 mr-1" />
                              {t('resume')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => viewLogs(item.id)}>
                            <Eye className="h-3 w-3 mr-1" />
                            {t('logs')}
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
          <span className="text-sm text-muted-foreground">{tc('total')} {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {tc('prevPage') || '上一页'}
            </Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
              {tc('nextPage') || '下一页'}
            </Button>
          </div>
        </div>
      </div>

      {/* 创建任务对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('createTask')}</DialogTitle>
            <DialogDescription>{t('createTaskDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('taskName')} *</Label>
              <Input value={form.task_name} onChange={(e) => setForm(f => ({ ...f, task_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('taskType')} *</Label>
              <Select value={form.task_type} onValueChange={(v) => setForm(f => ({ ...f, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory_alert">{taskTypeMap['inventory_alert']}</SelectItem>
                  <SelectItem value="data_cleanup">{taskTypeMap['data_cleanup']}</SelectItem>
                  <SelectItem value="report_generation">{taskTypeMap['report_generation']}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cron {t('expression')}</Label>
              <Input value={form.cron_expression} onChange={(e) => setForm(f => ({ ...f, cron_expression: e.target.value }))} placeholder="0 0 * * *" />
            </div>
            <div className="space-y-1">
              <Label>{tc('remark')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleCreate}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行日志对话框 */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('executionLogs')}</DialogTitle>
            <DialogDescription>{t('executionLogsDesc')}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('startTime')}</TableHead>
                <TableHead className="text-xs">{t('endTime')}</TableHead>
                <TableHead className="text-xs">{tc('status')}</TableHead>
                <TableHead className="text-xs">{t('result')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs">{log.start_time || '-'}</TableCell>
                    <TableCell className="text-xs">{log.end_time || '-'}</TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs">成功</Badge>
                      ) : log.status === 'failed' ? (
                        <Badge variant="destructive" className="text-xs">失败</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">运行中</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate">{log.result || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>{tc('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
