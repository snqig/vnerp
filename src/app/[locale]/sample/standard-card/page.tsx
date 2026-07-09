'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit,
  FileText,
  Copy,
  CheckCircle,
  XCircle,
  Bookmark,
  Library,
  FileText as QuoteIcon,
  ArrowRightCircle,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SampleCard {
  id: number;
  sample_no: string;
  sample_name: string;
  customer_name: string | null;
  product_name: string | null;
  version_no: string;
  status: number;
  total_cost: number;
  sample_work_order_no: string | null;
  formal_work_order_id: number | null;
  quote_id: number | null;
  create_time: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '草稿', variant: 'secondary' },
  2: { label: '打样中', variant: 'default' },
  3: { label: '已确认', variant: 'default' },
  4: { label: '已作废', variant: 'outline' },
};

export default function SampleCardListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [list, setList] = useState<SampleCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
      });
      if (statusFilter) params.set('status', statusFilter);
      const res = await authFetch(`/api/dcprint/sample-card?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleEdit = (id: number, mode: 'v1' | 'v2') => {
    router.push(`/sample/standard-card/input${mode === 'v2' ? '-v2' : ''}?id=${id}`);
  };

  const handleDuplicate = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/duplicate`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '新版本已创建', description: `ID: ${result.data.id}` });
        fetchList();
      } else {
        toast({ title: '复制失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const handleConfirm = async (id: number) => {
    if (!confirm('确认此工艺卡？确认后可用于报价和正式生产。')) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/confirm`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '已确认' });
        fetchList();
      } else {
        toast({ title: '确认失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '确认失败', variant: 'destructive' });
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确认作废此工艺卡？')) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/cancel`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast({ title: '已作废' });
        fetchList();
      } else {
        toast({ title: '作废失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '作废失败', variant: 'destructive' });
    }
  };

  const handleSaveAsTemplate = async (card: SampleCard) => {
    const templateName = window.prompt('请输入模板名称', `${card.sample_name} - 模板`);
    if (!templateName?.trim()) return;
    const category = window.prompt('请输入分类（可留空）', '') || '';
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${card.id}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: templateName.trim(),
          category: category.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '已存为模板', description: `模板ID: ${result.data.id}` });
      } else {
        toast({ title: '保存失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  const handleGenerateQuote = async (card: SampleCard) => {
    const markupInput = window.prompt('请输入加价率（%，默认 30）', '30');
    if (markupInput === null) return;
    const markupRate = Number(markupInput) || 30;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${card.id}/generate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markupRate }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: '报价单已生成',
          description: `${result.data.quoteNo} - ¥${result.data.quotedPrice.toFixed(2)}`,
        });
      } else {
        toast({ title: '生成失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '生成失败', variant: 'destructive' });
    }
  };

  const handleConvertWorkOrder = async (card: SampleCard) => {
    const qtyInput = window.prompt('请输入计划数量', '1000');
    if (qtyInput === null) return;
    const planQty = Number(qtyInput) || 1000;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${card.id}/convert-work-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planQty }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: '正式生产工单已生成',
          description: result.data.workOrderNo,
        });
        fetchList();
      } else {
        toast({ title: '转换失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '转换失败', variant: 'destructive' });
    }
  };

  const [varianceDialogOpen, setVarianceDialogOpen] = useState(false);
  const [varianceData, setVarianceData] = useState<Loose | null>(null);

  const handleViewVariance = async (card: SampleCard) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${card.id}/cost-variance`);
      const result = await res.json();
      if (result.success) {
        setVarianceData(result.data);
        setVarianceDialogOpen(true);
      } else {
        toast({ title: '查询失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '查询失败', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">打样工艺卡</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/sample/standard-card/template')}>
            <Library className="h-4 w-4 mr-1" />
            模板库
          </Button>
          <Button variant="outline" onClick={() => router.push('/sample/standard-card/input')}>
            <Plus className="h-4 w-4 mr-1" />
            {'新建工艺卡'}
          </Button>
          <Button onClick={() => router.push('/sample/standard-card/input-v2')}>
            <Plus className="h-4 w-4 mr-1" />
            {'复制'}
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8"
              placeholder="搜索编号、名称、客户..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="1">草稿</SelectItem>
              <SelectItem value="2">打样中</SelectItem>
              <SelectItem value="3">已确认</SelectItem>
              <SelectItem value="4">已作废</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchList} disabled={loading}>
            刷新
          </Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>编号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>客户</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">总成本</TableHead>
              <TableHead>工单号</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {list.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-mono text-sm">{card.sample_no}</TableCell>
                <TableCell>{card.sample_name}</TableCell>
                <TableCell>{card.customer_name || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{card.version_no}</Badge>
                </TableCell>
                <TableCell>
                  {STATUS_MAP[card.status] && (
                    <Badge variant={STATUS_MAP[card.status].variant}>
                      {STATUS_MAP[card.status].label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ¥{(card.total_cost || 0).toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {card.sample_work_order_no || '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {card.create_time ? new Date(card.create_time).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="编辑（经典模式）"
                      onClick={() => handleEdit(card.id, 'v1')}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="编辑（高效模式）"
                      onClick={() => handleEdit(card.id, 'v2')}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    {card.status === 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="复制新版本"
                        onClick={() => handleDuplicate(card.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {card.status === 2 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="确认"
                        onClick={() => handleConfirm(card.id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                    {card.status === 3 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="存为模板"
                        onClick={() => handleSaveAsTemplate(card)}
                      >
                        <Bookmark className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    )}
                    {card.status === 3 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="生成报价"
                        onClick={() => handleGenerateQuote(card)}
                      >
                        <QuoteIcon className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                    {card.status === 3 && !card.formal_work_order_id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="转正式工单"
                        onClick={() => handleConvertWorkOrder(card)}
                      >
                        <ArrowRightCircle className="h-3.5 w-3.5 text-orange-600" />
                      </Button>
                    )}
                    {card.status === 3 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="成本差异"
                        onClick={() => handleViewVariance(card)}
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                      </Button>
                    )}
                    {card.status !== 4 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="作废"
                        onClick={() => handleCancel(card.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-600">
            {'第'}
            {page} / {totalPages}
            {'页，共'}
            {total}
            {'项'}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <Dialog open={varianceDialogOpen} onOpenChange={setVarianceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>成本差异分析</DialogTitle>
          </DialogHeader>
          {varianceData && (
            <div className="space-y-3 py-2">
              {varianceData.workOrderNo && (
                <p className="text-sm text-gray-600">关联工单：{varianceData.workOrderNo}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    <TableHead className="text-right">预估</TableHead>
                    <TableHead className="text-right">实际</TableHead>
                    <TableHead className="text-right">差异</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>物料成本</TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.estimated.materialCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.actual.materialCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.variance.materialCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>人工成本</TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.estimated.laborCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.actual.laborCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.variance.laborCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>工装成本</TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.estimated.toolCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.actual.toolCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.variance.toolCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>合计</TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.estimated.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{varianceData.actual.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${varianceData.variance.totalCost >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      ¥{varianceData.variance.totalCost.toFixed(2)}
                      {' ('}
                      {varianceData.variance.varianceRate.toFixed(2)}%{')'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVarianceDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
