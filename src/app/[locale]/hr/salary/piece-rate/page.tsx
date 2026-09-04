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
  const ts = useTranslations('Common');
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
      toast.error(t('fetchFailed') || ts('k_pyqt59'));
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
            <h1 className="text-2xl font-bold">{t('pieceRate') || ts('k_1al09iu')}</h1>
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />{tc('add') || ts('k_ebh5gv')}</Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input
                placeholder={tc('search') || ts('k_1s2zo9c')}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={fetchRates}><Search className="h-4 w-4 mr-2" />{tc('search') || ts('k_367f3v')}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('processCode') || ts('k_1dy4roy')}</TableHead>
                  <TableHead>{t('processName') || ts('k_2jnrc0')}</TableHead>
                  <TableHead>{t('productType') || ts('k_tuwsjn')}</TableHead>
                  <TableHead>{t('unitPrice') || ts('k_isc1c5')}</TableHead>
                  <TableHead>{t('effectiveDate') || ts('k_1613r7i')}</TableHead>
                  <TableHead>{t('status') || ts('k_1ccx4t4')}</TableHead>
                  <TableHead className="w-24">{tc('actions') || ts('k_501w24')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{tc('loading') || ts('k_ldc0z9')}</TableCell></TableRow>
                ) : rates.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{tc('noData') || ts('k_6tzr61')}</TableCell></TableRow>
                ) : rates.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.processCode}</TableCell>
                    <TableCell>{r.processName}</TableCell>
                    <TableCell>{r.productType || '-'}</TableCell>
                    <TableCell className="font-mono">{Number(r.unitPrice).toFixed(4)}</TableCell>
                    <TableCell>{r.effectiveDate}</TableCell>
                    <TableCell><Badge variant={r.status === 1 ? 'default' : 'secondary'}>{r.status === 1 ? (t('active') || ts('k_5pm2ma')) : (t('inactive') || ts('k_6q9o5l'))}</Badge></TableCell>
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
