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
  const [searchUser, setSearchUser] = useState('');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        userName: searchUser,
      });
      const res = await authFetch('/api/system/login-log?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    fetchData();
  }, [page]);

  const handleClear = async () => {
    if (!confirm(tc("confirmClearLoginLogs"))) return;
    try {
      const res = await authFetch('/api/system/login-log', { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc("clearSuccess") });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc("failed"), variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("loginLog")}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc("searchUsername")}
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button size="sm" variant="destructive" onClick={handleClear}>
              {tc("clearLogs")}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc("username")}</TableHead>
                  <TableHead className="text-xs">{tc("loginTime")}</TableHead>
                  <TableHead className="text-xs">{tc("ipAddress")}</TableHead>
                  <TableHead className="text-xs">{tc("loginLocation")}</TableHead>
                  <TableHead className="text-xs">{tc("browser")}</TableHead>
                  <TableHead className="text-xs">{tc("os")}</TableHead>
                  <TableHead className="text-xs">{tc("status")}</TableHead>
                  <TableHead className="text-xs">{tc("message")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.user_name}</TableCell>
                    <TableCell className="text-xs">{item.login_time || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{item.ipaddr || '-'}</TableCell>
                    <TableCell className="text-xs">{item.login_location || '-'}</TableCell>
                    <TableCell className="text-xs">{item.browser || '-'}</TableCell>
                    <TableCell className="text-xs">{item.os || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status === 1 ? tc("success") : tc("failed")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-32 truncate">{item.msg || '-'}</TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                      {tc("noRecords")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{tc("totalItems", { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc("prevPage")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc("nextPage")}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
