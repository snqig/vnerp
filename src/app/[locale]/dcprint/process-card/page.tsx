'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Copy,
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
  1: { label: '草稿', variant: 'secondary' },
  2: { label: '打样中', variant: 'default' },
  3: { label: '已确认', variant: 'outline' },
  4: { label: '已作废', variant: 'destructive' },
};

export default function ProcessCardPage() {
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
      toast.error('加载工艺卡列表失败');
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
        toast.success('工艺卡已提交');
        fetchCards();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('工艺卡已确认');
        fetchCards();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确认作废此工艺卡？')) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('工艺卡已作废');
        fetchCards();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此工艺卡？')) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        fetchCards();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <MainLayout title={t('processCardManagement')}>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('all')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">全部</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('1')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
              <div className="text-sm text-muted-foreground">草稿</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('2')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.sampling}</div>
              <div className="text-sm text-muted-foreground">打样中</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('3')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.confirmed}</div>
              <div className="text-sm text-muted-foreground">已确认</div>
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
                    <TableHead>打样编号</TableHead>
                    <TableHead>打样名称</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>产品</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>基材</TableHead>
                    <TableHead>印刷色</TableHead>
                    <TableHead>预估工时</TableHead>
                    <TableHead>总成本</TableHead>
                    <TableHead>状态</TableHead>
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
                          {STATUS_MAP[card.status]?.label || '未知'}
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
                              查看
                            </DropdownMenuItem>
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
                                  提交
                                </DropdownMenuItem>
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
                                  确认
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancel(card.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                  作废
                                </DropdownMenuItem>
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
