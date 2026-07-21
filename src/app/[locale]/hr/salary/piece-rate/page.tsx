'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';

export default function PieceRatePage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/piece-rate?keyword=${keyword}`);
      const json = await res.json();
      if (json.code === 200) setRates(json.data.list || []);
    } catch {
      toast.error(t('fetchFailed') || '获取工序单价列表失败');
    }
    setLoading(false);
  };

  useEffect(() => { fetchRates(); }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('pieceRate') || '工序单价管理'}</h1>
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />{tc('add') || '新增单价'}</Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input
                placeholder={tc('search') || '搜索工序名称...'}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={fetchRates}><Search className="h-4 w-4 mr-2" />{tc('search') || '搜索'}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('processCode') || '工序编号'}</TableHead>
                  <TableHead>{t('processName') || '工序名称'}</TableHead>
                  <TableHead>{t('productType') || '产品类型'}</TableHead>
                  <TableHead>{t('unitPrice') || '单价'}</TableHead>
                  <TableHead>{t('effectiveDate') || '生效日期'}</TableHead>
                  <TableHead>{t('status') || '状态'}</TableHead>
                  <TableHead className="w-24">{tc('actions') || '操作'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{tc('loading') || '加载中...'}</TableCell></TableRow>
                ) : rates.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{tc('noData') || '暂无数据'}</TableCell></TableRow>
                ) : rates.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.processCode}</TableCell>
                    <TableCell>{r.processName}</TableCell>
                    <TableCell>{r.productType || '-'}</TableCell>
                    <TableCell className="font-mono">{Number(r.unitPrice).toFixed(4)}</TableCell>
                    <TableCell>{r.effectiveDate}</TableCell>
                    <TableCell><Badge variant={r.status === 1 ? 'default' : 'secondary'}>{r.status === 1 ? (t('active') || '启用') : (t('inactive') || '停用')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
