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
  user_name: string;
  login_time: string;
  ipaddr: string;
  login_location: string;
  browser: string;
  os: string;
  status: number;
  msg: string;
}

export default function LoginLogPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchUser, setSearchUser] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        userName: searchUser,
      });
      const res = await authFetch('/api/system/login-log?' + params);
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
    if (!confirm(tc('confirmClearLoginLogs'))) return;
    try {
      const res = await authFetch('/api/system/login-log', { method: 'DELETE' });
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
    { key: 'user_name', title: tc('username'), render: (r) => r.user_name },
    { key: 'login_time', title: tc('loginTime'), render: (r) => r.login_time || '-' },
    { key: 'ipaddr', title: tc('ipAddress'), render: (r) => <span className="font-mono">{r.ipaddr || '-'}</span> },
    { key: 'login_location', title: tc('loginLocation'), render: (r) => r.login_location || '-' },
    { key: 'browser', title: tc('browser'), render: (r) => r.browser || '-' },
    { key: 'os', title: tc('os'), render: (r) => r.os || '-' },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => (
        <Badge variant={r.status === 1 ? 'default' : 'destructive'} className="text-xs">
          {r.status === 1 ? tc('success') : tc('failed')}
        </Badge>
      ),
    },
    { key: 'msg', title: tc('message'), render: (r) => <span className="max-w-32 truncate">{r.msg || '-'}</span> },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('loginLog')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchUsername')}
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
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
