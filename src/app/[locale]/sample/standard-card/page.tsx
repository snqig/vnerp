'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Printer,
  FileText,
  Package,
  Factory,
  ClipboardList,
  Sparkles,
  Calendar,
  Ruler,
  Palette,
  Settings,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// 标准卡列表项接口（符合设计文档 5.1 节 standard_cards 表结构）
interface StandardCardListItem {
  id: number;
  card_no: string; // 格式：SC+类型代码+YYYYMMDD+3位序号
  name: string; // 标准卡名称
  type: string; // 类型：color/process/quality/comprehensive
  version: string; // 版本号
  material_id?: number; // 适用产品 ID
  status: number; // 状态：1=草稿 2=待审核 3=已生效 4=已失效

  // 扩展字段（兼容丝网印刷行业特性）
  customer_name: string;
  customer_code: string;
  product_name: string;

  // 工艺参数
  finished_size: string;
  tolerance: string;
  material_name: string;
  material_type: string;
  layout_type: string;
  print_type: string;
  process_method: string;
  glue_type: string;
  packing_type: string;
  mold_type: string;

  create_time: string;
  update_time: string;
}

// 标准卡类型定义（符合设计文档第3节）
type StandardCardType = 'color' | 'process' | 'quality' | 'comprehensive';

// 标准卡类型映射（移到组件内部以使用翻译函数）
const typeMapColors: Record<StandardCardType, string> = {
  color: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
  process: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  quality: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  comprehensive: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
};

// 审核状态接口
interface ApprovalStatus {
  status?: number;
  statusLabel?: string;
  currentStep?: number;
  totalSteps?: number;
  canApprove?: boolean;
  canReject?: boolean;
  message?: string;
  steps?: Array<{
    type: string;
    label: string;
    status: string;
    approver?: string;
    time?: string;
  }>;
}



export default function StandardCardPage() {
  // 翻译钩子
  const tc = useTranslations('Common');
  const t = useTranslations('StandardCard');

  // 状态映射（符合设计文档 5.1 节：草稿、待审核、已生效、已失效）
  const statusMap: Record<number, { label: string; color: string }> = {
    1: {
      label: tc('draft'),
      color:
        'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    },
    2: {
      label: tc('pending'),
      color:
        'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
    },
    3: {
      label: t('effective'),
      color:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    },
    4: {
      label: t('invalid'),
      color:
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    },
  };

  // 印刷类型选项
  const printTypes = [tc('all'), t('offsetPrint'), t('rollScreenPrint'), t('sheetScreenPrint'), t('rotaryPrint')];

  // 加工方式选项
  const processMethods = [tc('all'), t('dieCut'), t('stamping')];

  // 材料类型选项
  const materialTypes = [tc('all'), t('hardGlue'), t('softGlue')];

  const router = useRouter();
  const [cards, setCards] = useState<StandardCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [printTypeFilter, setPrintTypeFilter] = useState<string>(tc('all'));
  const [processMethodFilter, setProcessMethodFilter] = useState<string>(tc('all'));
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>(tc('all'));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<StandardCardListItem | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cardToApprove, setCardToApprove] = useState<StandardCardListItem | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // 加载标准卡数据
  const loadCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (debouncedSearchTerm) {
        params.append('keyword', debouncedSearchTerm);
      }

      const response = await fetch(`/api/standard-cards?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const cardList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setCards(cardList);
        setTotalCount(result.pagination?.total || result.data?.total || 0);
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // 从数据库加载标准卡数据
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadCards();
  }, [currentPage, statusFilter, debouncedSearchTerm]);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    // 搜索会触发 useEffect 重新加载数据
  };

  // 分页计算
  const totalPages = Math.ceil(totalCount / pageSize);

  // 客户端筛选
  const filteredCards = cards.filter((card) => {
    if (printTypeFilter !== tc('all') && card.print_type !== printTypeFilter) return false;
    if (processMethodFilter !== tc('all') && card.process_method !== processMethodFilter) return false;
    if (materialTypeFilter !== tc('all') && card.material_type !== materialTypeFilter) return false;
    return true;
  });

  const handleView = (card: StandardCardListItem) => {
    window.open(
      `/sample/standard-card/print?id=${card.id}`,
      '_blank',
      'width=1200,height=800,scrollbars=yes'
    );
  };

  const handlePrint = (card: StandardCardListItem) => {
    window.open(
      `/sample/standard-card/print?id=${card.id}&autoPrint=true`,
      '_blank'
    );
  };

  const handleEdit = (card: StandardCardListItem) => {
    router.push(`/sample/standard-card/input-v2?id=${card.id}&edit=true`);
  };

  const handleDelete = (card: StandardCardListItem) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  const handleApprove = async (card: StandardCardListItem) => {
    setCardToApprove(card);
    setLoadingApproval(true);
    try {
      const response = await fetch(`/api/standard-cards/approve?id=${card.id}`);
      const result = await response.json();
      if (result.success) {
        setApprovalStatus(result.data);
        setApproveDialogOpen(true);
      } else {
        alert(t('getReviewStatusFailed') + ': ' + result.message);
      }
    } catch (error) {
      alert(t('getReviewStatusFailed'));
    } finally {
      setLoadingApproval(false);
    }
  };

  const handleApproveAction = async (type: string, userName: string) => {
    if (!cardToApprove) return;

    try {
      const response = await fetch('/api/standard-cards/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardToApprove.id,
          type,
          userId: 1,
          userName,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setApproveDialogOpen(false);
        loadCards();
      } else {
        alert(t('operationFailed') + ': ' + result.message);
      }
    } catch (error) {
      alert(t('reviewFailed'));
    }
  };

  const handleUnapprove = async (type: string) => {
    if (!cardToApprove) return;

    if (!confirm(t('revokeConfirm'))) return;

    try {
      const response = await fetch('/api/standard-cards/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardToApprove.id,
          type,
          userId: 1,
          userName: 'Current User',
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setApproveDialogOpen(false);
        loadCards();
      } else {
        alert(t('operationFailed') + ': ' + result.message);
      }
    } catch (error) {
      alert(t('revokeFailed'));
    }
  };

  const confirmDelete = async () => {
    if (cardToDelete) {
      try {
        const response = await fetch(`/api/standard-cards?id=${cardToDelete.id}`, {
          method: 'DELETE',
        });

        // 尝试解析 JSON，如果失败则使用文本
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          result = { success: response.ok, message: text };
        }

        if (result.success) {
          loadCards();
          setDeleteDialogOpen(false);
          setCardToDelete(null);
        } else {
          alert(t('deleteFailed') + ': ' + (result.message || t('unknownError')));
        }
      } catch (error: any) {
        alert(t('deleteFailed') + ': ' + (error.message || t('checkNetwork')));
      }
    }
  };

  const getStatusBadge = (status: number) => {
    const { label, color } = statusMap[status] || statusMap[1];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}
      >
        {label}
      </span>
    );
  };

  const handleSubmitForReview = async (card: StandardCardListItem) => {
    try {
      const response = await fetch('/api/standard-cards/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          type: 'review',
          userId: 1,
          userName: 'Current User',
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(t('submitReviewSuccess'));
        loadCards();
      } else {
        alert(t('submitReviewFailed') + ': ' + result.message);
      }
    } catch (error) {
      alert(t('submitReviewFailed'));
    }
  };

  const handleReject = async (card: StandardCardListItem) => {
    if (!confirm(t('rejectConfirm'))) return;
    try {
      const response = await fetch('/api/standard-cards/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          type: 'reject',
          userId: 1,
          userName: 'Current User',
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(t('rejectSuccess'));
        loadCards();
      } else {
        alert(t('rejectFailed') + ': ' + result.message);
      }
    } catch (error) {
      alert(t('rejectFailed'));
    }
  };

  return (
    <MainLayout title={t('listTitle')}>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-500" />
              {t('listTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('listSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/sample/standard-card/input">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('newCardBtn')}
              </Button>
            </Link>
            <Link href="/sample/standard-card/input-v2">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('traditionalInput')}
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">{t('totalCount')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.filter((c) => c.status === 3).length}</p>
                <p className="text-xs text-muted-foreground">{t('effective')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Factory className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.filter((c) => c.status === 2).length}</p>
                <p className="text-xs text-muted-foreground">{t('pendingReview')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.filter((c) => c.status === 1).length}</p>
                <p className="text-xs text-muted-foreground">{t('draft')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Palette className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.filter((c) => c.status === 4).length}</p>
                <p className="text-xs text-muted-foreground">{t('invalid')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-1 gap-3 items-center w-full lg:w-auto flex-wrap">
                {/* 搜索框 */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>

                {/* 状态筛选 */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={tc("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="1">{t('draft')}</SelectItem>
                    <SelectItem value="2">{t('pendingReview')}</SelectItem>
                    <SelectItem value="3">{t('enabled')}</SelectItem>
                    <SelectItem value="4">{t('archived')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* 印刷类型筛选 */}
                <Select value={printTypeFilter} onValueChange={setPrintTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder={t('printTypeFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    {printTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 加工方式筛选 */}
                <Select value={processMethodFilter} onValueChange={setProcessMethodFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('processMethodFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    {processMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 材料类型筛选 */}
                <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('materialTypeFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="secondary" onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  {t('query')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标准卡列表 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('cardList')}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {t('totalItems', { total: totalCount, current: currentPage, totalPages: totalPages || 1 })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={filteredCards.length > 0 && filteredCards.every(c => selectedIds.has(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredCards.map(c => c.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </TableHead>
                    <TableHead className="w-[50px]">{t('index')}</TableHead>
                    <TableHead className="w-[130px]">{t('cardNoCol')}</TableHead>
                    <TableHead className="w-[120px]">{t('customerCol')}</TableHead>
                    <TableHead className="w-[60px]">{t('versionCol')}</TableHead>
                    <TableHead className="w-[90px]">{t('dateCol')}</TableHead>
                    <TableHead className="w-[120px]">{t('productNameCol')}</TableHead>
                    <TableHead className="w-[110px]">{t('customerCodeCol')}</TableHead>
                    <TableHead className="w-[70px]">{t('statusCol')}</TableHead>
                    <TableHead className="w-[70px] text-center">{t('actionCol')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          {t('loading')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCards.map((card, idx) => (
                      <TableRow key={card.id} className="group hover:bg-muted/30">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(card.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) {
                                next.add(card.id);
                              } else {
                                next.delete(card.id);
                              }
                              setSelectedIds(next);
                            }}
                            className="w-4 h-4"
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {card.card_no}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium truncate max-w-[120px] block" title={card.customer_name}>
                            {card.customer_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {card.version}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {card.create_time?.split(' ')[0] || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[120px] block" title={card.product_name}>
                            {card.product_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{card.customer_code || '-'}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(card.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {card.status === 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600"
                                onClick={() => handleApprove(card)}
                                title={t('review')}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleView(card)}
                              title={tc("view")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePrint(card)}
                              title={tc("print")}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {card.status === 1 && (
                                  <DropdownMenuItem onClick={() => handleSubmitForReview(card)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    {t('submitReview')}
                                  </DropdownMenuItem>
                                )}
                                {card.status === 2 && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApprove(card)}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      {t('review')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReject(card)} className="text-orange-600">
                                      <XCircle className="h-4 w-4 mr-2" />
                                      {t('reject')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleEdit(card)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(card)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {t('showingRange', { start: (currentPage - 1) * pageSize + 1, end: Math.min(currentPage * pageSize, totalCount), total: totalCount })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('prevPage')}
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirmDelete')}</DialogTitle>
              <DialogDescription>
                {t('confirmDeleteMsg', { cardNo: cardToDelete?.card_no || '' })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {tc('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 审核对话框 */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('reviewProcess')}</DialogTitle>
              <DialogDescription>{t('reviewCardNo', { cardNo: cardToApprove?.card_no || '' })}</DialogDescription>
            </DialogHeader>
            {loadingApproval ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : approvalStatus ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{t('currentStatus')}</span>
                  <Badge variant={approvalStatus.status === 3 ? 'default' : 'secondary'}>
                    {approvalStatus.statusLabel}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {approvalStatus.steps?.map((step: any, index: number) => (
                    <div key={step.type} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : step.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{step.name}</span>
                          {step.status === 'completed' && step.approver && (
                            <Badge variant="outline" className="text-xs">
                              {step.approver}
                            </Badge>
                          )}
                        </div>
                        {step.status === 'completed' && (
                          <div className="text-xs text-muted-foreground mt-1">{t('reviewed')}</div>
                        )}
                        {step.status === 'pending' && (
                          <div className="text-xs text-muted-foreground mt-1">{t('waitingReview')}</div>
                        )}
                        {step.status === 'waiting' && (
                          <div className="text-xs text-muted-foreground mt-1">{t('waitingPrevious')}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {step.status === 'pending' && (
                          <Input
                            placeholder={t('reviewerPlaceholder')}
                            className="w-40"
                            id={`approve-input-${step.type}`}
                          />
                        )}
                        {step.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(
                                `approve-input-${step.type}`
                              ) as HTMLInputElement;
                              if (input?.value.trim() !== '') {
                                handleApproveAction(step.type, input.value.trim());
                              } else {
                                alert(t('reviewerRequired'));
                              }
                            }}
                          >
                            {t('review')}
                          </Button>
                        )}
                        {step.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnapprove(step.type)}
                          >
                            {t('revoke')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
