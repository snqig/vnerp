'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';

interface Item {
  id: number;
  title: string;
  oper_name: string;
  oper_type: string;
  oper_method: string;
  oper_url: string;
  oper_ip: string;
  oper_time: string;
  status: number;
}

export default function OperLogPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTitle, setSearchTitle] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        title: searchTitle,
      });
      const res = await authFetch('/api/system/oper-log?' + params);
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

  const handleClear = async () => {
    if (!confirm(tc('confirmClearOperLogs'))) return;
    try {
      const res = await authFetch('/api/system/oper-log', { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('clearSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const columns: StandardTableColumn<Item>[] = [
    { key: 'title', title: tc('operTitle'), render: (r) => r.title || '-' },
    { key: 'oper_name', title: tc('operator'), render: (r) => r.oper_name || '-' },
    { key: 'oper_type', title: tc('operType'), render: (r) => r.oper_type || '-' },
    { key: 'oper_method', title: tc('requestMethod'), render: (r) => r.oper_method || '-' },
    { key: 'oper_url', title: tc('operUrl'), render: (r) => <span className="max-w-40 truncate font-mono">{r.oper_url || '-'}</span> },
    { key: 'oper_ip', title: tc('ipAddress'), render: (r) => <span className="font-mono">{r.oper_ip || '-'}</span> },
    { key: 'oper_time', title: tc('operTime'), render: (r) => r.oper_time || '-' },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => (
        <Badge variant={r.status === 1 ? 'default' : 'destructive'} className="text-xs">
          {r.status === 1 ? tc('success') : tc('failed')}
        </Badge>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('operLog')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOperTitle')}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" variant="destructive" onClick={handleClear}>
              {tc('clearLogs')}
            </Button>
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
              emptyText={tc('noRecords')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
