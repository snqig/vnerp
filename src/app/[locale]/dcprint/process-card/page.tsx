'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROCESS_CARD_STATUS_LABEL } from '@/lib/status-labels';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/auth-fetch';

interface SampleCard {
  id: number;
  sample_no: string;
  sample_name: string;
  customer_name: string;
  product_name: string;
  version_no: string;
  status: number;
  substrate_material_name: string;
  print_color: string;
  total_cost: number;
  estimated_hour: number;
  create_time: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: PROCESS_CARD_STATUS_LABEL[1], variant: 'secondary' },
  2: { label: PROCESS_CARD_STATUS_LABEL[2], variant: 'default' },
  3: { label: PROCESS_CARD_STATUS_LABEL[3], variant: 'outline' },
  4: { label: PROCESS_CARD_STATUS_LABEL[4], variant: 'destructive' },
};

export default function ProcessCardPage() {
  const ts = useTranslations('Dcprint');
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');
  const router = useRouter();

  const [cards, setCards] = useState<SampleCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sampling: 0,
    confirmed: 0,
    cancelled: 0,
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await authFetch(`/api/dcprint/sample-card?${params}`);
      const data = await res.json();
      if (data.success) {
        const list = data.data?.list || data.data || [];
        setCards(list);
        setStats({
          total: data.data?.total || list.length,
          draft: list.filter((c: SampleCard) => c.status === 1).length,
          sampling: list.filter((c: SampleCard) => c.status === 2).length,
          confirmed: list.filter((c: SampleCard) => c.status === 3).length,
          cancelled: list.filter((c: SampleCard) => c.status === 4).length,
        });
      }
    } catch {
      toast.error(ts('k_1945u9p'));
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterStatus]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSubmit = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_14yk4ax'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_sojurb'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm(ts('k_1yr6vyp'))) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_regfno'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(ts('k_1s94v9q'))) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_1hlqs'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(ts('k_1ijrr73'));
    }
  };

  return (
    <MainLayout title={t('processCardManagement')}>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('all')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">{ts('k_q6w6ul')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('1')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
              <div className="text-sm text-muted-foreground">{ts('k_oc54qp')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('2')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.sampling}</div>
              <div className="text-sm text-muted-foreground">{ts('k_1lta3ye')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('3')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.confirmed}</div>
              <div className="text-sm text-muted-foreground">{ts('k_nmir1b')}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('processCardList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder={tc('search')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCards()}
                />
              </div>
              <Button onClick={() => fetchCards()} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
              <Button onClick={() => router.push('/dcprint/process-card/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {tc('add')}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{tc('noData')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_1y8ybpg')}</TableHead>
                    <TableHead>{ts('k_11gs5ia')}</TableHead>
                    <TableHead>{ts('k_ush9hy')}</TableHead>
                    <TableHead>{ts('k_aa5e9x')}</TableHead>
                    <TableHead>{ts('k_va46gx')}</TableHead>
                    <TableHead>{ts('k_1t8ltxj')}</TableHead>
                    <TableHead>{ts('k_4sf5la')}</TableHead>
                    <TableHead>{ts('k_q7sxwm')}</TableHead>
                    <TableHead>{ts('k_1ugaydy')}</TableHead>
                    <TableHead>{ts('k_1ccx4t4')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono">{card.sample_no}</TableCell>
                      <TableCell>{card.sample_name}</TableCell>
                      <TableCell>{card.customer_name || '-'}</TableCell>
                      <TableCell>{card.product_name || '-'}</TableCell>
                      <TableCell>{card.version_no}</TableCell>
                      <TableCell>{card.substrate_material_name || '-'}</TableCell>
                      <TableCell>{card.print_color || '-'}</TableCell>
                      <TableCell>{card.estimated_hour ? `${card.estimated_hour}h` : '-'}</TableCell>
                      <TableCell>¥{card.total_cost?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_MAP[card.status]?.variant || 'secondary'}>
                          {STATUS_MAP[card.status]?.label || ts('k_1lpnuh4')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dcprint/process-card/${card.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {ts('k_10fbkvl')}</DropdownMenuItem>
                            {card.status === 1 && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/dcprint/process-card/${card.id}/edit`)
                                  }
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSubmit(card.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  {ts('k_ybr38x')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(card.id)}>
                                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {card.status === 2 && (
                              <>
                                <DropdownMenuItem onClick={() => handleConfirm(card.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                  {ts('k_kre8wf')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancel(card.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                  {ts('k_wph6a4')}</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
