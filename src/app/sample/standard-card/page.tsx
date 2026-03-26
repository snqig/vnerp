'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Link from 'next/link';

// 标准卡列表项接口（基于 prd_standard_card 表）
interface StandardCardListItem {
  id: number;
  cardNo: string;
  customerName: string;
  customerCode: string;
  productName: string;
  version: string;
  date: string;
  finishedSize: string;
  tolerance: string;
  materialName: string;
  materialType: string;
  layoutType: string;
  printType: string;
  processMethod: string;
  glueType: string;
  packingType: string;
  status: number;
  createTime: string;
  updateTime: string;
}

// 状态映射
const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: '草稿', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  2: { label: '待审核', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  3: { label: '已启用', color: 'bg-green-100 text-green-800 border-green-200' },
  4: { label: '已归档', color: 'bg-blue-100 text-blue-800 border-blue-200' },
};

// 印刷类型选项
const printTypes = ['全部', '胶印', '卷料丝印', '片料丝印', '轮转印'];

// 加工方式选项
const processMethods = ['全部', '模切', '冲压'];

// 材料类型选项
const materialTypes = ['全部', '硬胶', '软胶'];

export default function StandardCardPage() {
  const router = useRouter();
  const [cards, setCards] = useState<StandardCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [printTypeFilter, setPrintTypeFilter] = useState<string>('全部');
  const [processMethodFilter, setProcessMethodFilter] = useState<string>('全部');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('全部');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<StandardCardListItem | null>(null);
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
      if (searchTerm) {
        params.append('keyword', searchTerm);
      }

      const response = await fetch(`/api/standard-cards?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // 转换数据库字段为前端格式
        const formattedCards: StandardCardListItem[] = result.data.map((item: any) => ({
          id: item.id,
          cardNo: item.card_no,
          customerName: item.customer_name,
          customerCode: item.customer_code,
          productName: item.product_name,
          version: item.version,
          date: item.date ? item.date.split('T')[0] : '',
          finishedSize: item.finished_size,
          tolerance: item.tolerance,
          materialName: item.material_name,
          materialType: item.material_type,
          layoutType: item.layout_type,
          printType: item.print_type,
          processMethod: item.process_method,
          glueType: item.glue_type,
          packingType: item.packing_type,
          status: item.status,
          createTime: item.create_time,
          updateTime: item.update_time,
        }));
        console.log('API返回数据:', result.data.length, '条');
        console.log('格式化后数据:', formattedCards.length, '条');
        setCards(formattedCards);
        setTotalCount(result.pagination?.total || 0);
      } else {
        console.error('加载数据失败:', result.message);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 从数据库加载标准卡数据
  useEffect(() => {
    loadCards();
  }, [currentPage, statusFilter, searchTerm]);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    // 搜索会触发 useEffect 重新加载数据
  };

  // 分页计算
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // 直接使用 API 返回的数据，不再进行客户端筛选
  const filteredCards = cards;

  const handleView = (card: StandardCardListItem) => {
    window.open(`/sample/standard-card/print?id=${card.id}`, '_blank', 'width=1200,height=800,scrollbars=yes');
  };

  const handlePrint = (card: StandardCardListItem) => {
    const printWindow = window.open(
      `/sample/standard-card/print?id=${card.id}&autoPrint=true`,
      '_blank',
      'width=1200,height=800,scrollbars=yes'
    );
  };

  const handleEdit = (card: StandardCardListItem) => {
    router.push(`/sample/standard-card/input-v2?id=${card.id}&edit=true`);
  };

  const handleDelete = (card: StandardCardListItem) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
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
          alert('删除失败: ' + (result.message || '未知错误'));
        }
      } catch (error: any) {
        console.error('删除失败:', error);
        alert('删除失败: ' + (error.message || '请检查网络连接'));
      }
    }
  };

  const getStatusBadge = (status: number) => {
    const { label, color } = statusMap[status] || statusMap[1];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <MainLayout title="标准卡管理">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-500" />
              标准卡管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理产品标准卡信息，支持新建、编辑、预览和打印
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/sample/standard-card/input">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                传统录入
              </Button>
            </Link>
            <Link href="/sample/standard-card/input-v2">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                新建标准卡
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
                <p className="text-xs text-muted-foreground">总数量</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.filter((c) => c.status === 3).length}
                </p>
                <p className="text-xs text-muted-foreground">已启用</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Factory className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.filter((c) => c.status === 2).length}
                </p>
                <p className="text-xs text-muted-foreground">待审核</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.filter((c) => c.status === 1).length}
                </p>
                <p className="text-xs text-muted-foreground">草稿</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <Palette className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.filter((c) => c.status === 4).length}
                </p>
                <p className="text-xs text-muted-foreground">已归档</p>
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
                    placeholder="搜索编号、客户、产品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>

                {/* 状态筛选 */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">草稿</SelectItem>
                    <SelectItem value="2">待审核</SelectItem>
                    <SelectItem value="3">已启用</SelectItem>
                    <SelectItem value="4">已归档</SelectItem>
                  </SelectContent>
                </Select>

                {/* 印刷类型筛选 */}
                <Select value={printTypeFilter} onValueChange={setPrintTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="印刷类型" />
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
                    <SelectValue placeholder="加工方式" />
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
                    <SelectValue placeholder="材料类型" />
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
                  查询
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标准卡列表 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">标准卡列表</CardTitle>
              <span className="text-sm text-muted-foreground">
                共 {totalCount} 条，第 {currentPage}/{totalPages || 1} 页
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[130px]">标准卡编号</TableHead>
                    <TableHead className="w-[160px]">客户信息</TableHead>
                    <TableHead className="w-[140px]">产品名称</TableHead>
                    <TableHead className="w-[60px]">版本</TableHead>
                    <TableHead className="w-[100px]">日期</TableHead>
                    <TableHead className="w-[100px]">成品尺寸</TableHead>
                    <TableHead className="w-[120px]">材料名称</TableHead>
                    <TableHead className="w-[80px]">材料类型</TableHead>
                    <TableHead className="w-[80px]">印刷类型</TableHead>
                    <TableHead className="w-[70px]">加工方式</TableHead>
                    <TableHead className="w-[70px]">状态</TableHead>
                    <TableHead className="w-[70px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          加载中...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCards.map((card) => (
                      <TableRow key={card.id} className="group hover:bg-muted/30">
                        <TableCell className="font-mono text-sm font-medium">
                          {card.cardNo}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[140px]" title={card.customerName}>
                              {card.customerName}
                            </span>
                            <span className="text-xs text-muted-foreground">{card.customerCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[120px] block" title={card.productName}>
                            {card.productName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {card.version}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {card.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Ruler className="h-3 w-3 text-muted-foreground" />
                            {card.finishedSize}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[100px] block" title={card.materialName}>
                            {card.materialName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {card.materialType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{card.printType}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {card.processMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(card.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleView(card)}
                              title="查看"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePrint(card)}
                              title="打印"
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
                                <DropdownMenuItem onClick={() => handleEdit(card)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(card)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
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
                  显示第 {(currentPage - 1) * pageSize + 1} 到{' '}
                  {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
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
                    下一页
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
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                您确定要删除标准卡 <strong>{cardToDelete?.cardNo}</strong> 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
