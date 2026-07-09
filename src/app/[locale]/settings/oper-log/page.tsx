'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
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
  const [searchTitle, setSearchTitle] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('operTitle')}</TableHead>
                  <TableHead className="text-xs">{tc('operator')}</TableHead>
                  <TableHead className="text-xs">{tc('operType')}</TableHead>
                  <TableHead className="text-xs">{tc('requestMethod')}</TableHead>
                  <TableHead className="text-xs">{tc('operUrl')}</TableHead>
                  <TableHead className="text-xs">{tc('ipAddress')}</TableHead>
                  <TableHead className="text-xs">{tc('operTime')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.title || '-'}</TableCell>
                    <TableCell className="text-xs">{item.oper_name || '-'}</TableCell>
                    <TableCell className="text-xs">{item.oper_type || '-'}</TableCell>
                    <TableCell className="text-xs">{item.oper_method || '-'}</TableCell>
                    <TableCell className="text-xs max-w-40 truncate font-mono">
                      {item.oper_url || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.oper_ip || '-'}</TableCell>
                    <TableCell className="text-xs">{item.oper_time || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status === 1 ? tc('success') : tc('failed')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{tc('totalItems', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
