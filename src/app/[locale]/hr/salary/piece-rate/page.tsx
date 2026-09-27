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
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';

interface PieceRate {
  id: number;
  processCode: string;
  productType: string;
  unitPrice: number;
  unit: string;
  qualityThreshold: number;
  effectiveDate: string;
  status: number;
}

export default function PieceRatePage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [rates, setRates] = useState<PieceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/piece-rate?keyword=${encodeURIComponent(keyword)}`);
      const json = await res.json();
      if (json.code === 200) setRates(json.data.list || []);
    } catch {
      toast({ title: tc('error'), description: tc('fetchFailed'), variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(fetchRates, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <MainLayout title={t('pieceRate')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">{t('pieceRate')}</h1>
          </div>
          <Button size="sm">
            <Plus className="h-3 w-3 mr-1" />{tc('add')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input
                placeholder={tc('search')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm h-8"
              />
              <Button variant="outline" size="sm" onClick={fetchRates}>
                <Search className="h-3 w-3 mr-1" />{tc('search')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{'工序代码'}</TableHead>
                  <TableHead className="text-xs">{'产品类型'}</TableHead>
                  <TableHead className="text-xs text-right">{'单价'}</TableHead>
                  <TableHead className="text-xs">{'单位'}</TableHead>
                  <TableHead className="text-xs text-right">{'质量标准(%)'}</TableHead>
                  <TableHead className="text-xs">{'生效日期'}</TableHead>
                  <TableHead className="text-xs">{'状态'}</TableHead>
                  <TableHead className="text-xs w-20">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">{tc('loading')}</TableCell></TableRow>
                ) : rates.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">{tc('noData')}</TableCell></TableRow>
                ) : rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono">{r.processCode}</TableCell>
                    <TableCell className="text-xs">{r.productType || '-'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">¥{Number(r.unitPrice).toFixed(4)}</TableCell>
                    <TableCell className="text-xs">{r.unit || '件'}</TableCell>
                    <TableCell className="text-xs text-right">{r.qualityThreshold != null ? r.qualityThreshold.toFixed(2) + '%' : '-'}</TableCell>
                    <TableCell className="text-xs">{r.effectiveDate || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 1 ? 'default' : 'secondary'} className="text-xs">{r.status === 1 ? tc('active') : tc('inactive')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 dark:text-red-400"><Trash2 className="h-3 w-3" /></Button>
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
