'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { InputV2Form } from './InputV2Form';
import { InputCardForm } from './InputCardForm';
import {
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

// 标准卡状态映射
const STATUS_MAP: Record<number, { label: string; color: 'gray' | 'blue' | 'green' | 'red' }> = {
  1: { label: '草稿', color: 'gray' },
  2: { label: '已审核', color: 'blue' },
  3: { label: '已确认', color: 'green' },
  4: { label: '已作废', color: 'red' },
};

// Badge variant 与颜色映射
const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  gray: 'secondary',
  blue: 'default',
  green: 'default',
  red: 'destructive',
};

function StandardCardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // mode: 'list' 列表 | 'v2' 现代化录入 | 'card' A4 表格录入
  const [mode, setMode] = useState<'list' | 'v2' | 'card'>('list');
  const editId = searchParams.get('id');
  const isEdit = searchParams.get('edit') === 'true';

  // 列表数据
  const [list, setList] = useState<Loose[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 导入相关
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化：根据 URL 参数判断是否直接进入编辑模式
  useEffect(() => {
    if (isEdit && editId) {
      // 默认进入现代化录入编辑模式
      setMode('v2');
    }
  }, [isEdit, editId]);

  // 获取列表数据
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/standard-cards?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(
        keyword
      )}&status=${statusFilter}`;
      const response = await authFetch(url);
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        setList(Array.isArray(data) ? data : []);
        const pag = result.pagination || {};
        setTotal(pag.total || 0);
        setTotalPages(pag.totalPages || 0);
      } else {
        toast({ title: result.message || '获取列表失败', variant: 'destructive' });
      }
    } catch (e) {
      console.error('获取列表失败:', e);
      toast({ title: '获取列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, toast]);

  // 首次加载及筛选条件变化时获取数据
  useEffect(() => {
    if (mode === 'list') {
      fetchList();
    }
  }, [mode, page, statusFilter, fetchList]);

  // 搜索按钮触发
  const handleSearch = () => {
    setPage(1);
    fetchList();
  };

  // 删除标准卡
  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此标准卡吗？')) return;
    try {
      const response = await authFetch(`/api/standard-cards?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast({ title: '删除成功' });
        fetchList();
      } else {
        toast({ title: result.message || '删除失败', variant: 'destructive' });
      }
    } catch (e) {
      console.error('删除失败:', e);
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // 查看按钮：跳转到打印预览页
  const handleView = (id: number) => {
    router.push(`/sample/standard-card/print?id=${id}`);
  };

  // 编辑按钮：切换到现代化录入模式，并通过 URL 参数传递编辑标识
  const handleEdit = (id: number) => {
    router.push(`/sample/standard-card?id=${id}&edit=true`);
    setMode('v2');
  };

  // 导入：触发隐藏的文件选择框
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件导入（支持 JSON）
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const records = JSON.parse(text);
      if (!Array.isArray(records)) {
        toast({ title: '文件格式错误：应为 JSON 数组', variant: 'destructive' });
        return;
      }
      let successCount = 0;
      let failCount = 0;
      for (const record of records) {
        try {
          const response = await authFetch('/api/standard-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
          });
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      toast({
        title: `导入完成：成功 ${successCount} 条，失败 ${failCount} 条`,
      });
      fetchList();
    } catch (err) {
      console.error('导入失败:', err);
      toast({ title: '导入失败：文件解析错误', variant: 'destructive' });
    } finally {
      setImporting(false);
      // 清空文件选择，便于重复导入同名文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 导出：拉取全部数据并下载为 JSON 文件
  const handleExport = async () => {
    try {
      // 拉取所有数据（pageSize 设置较大值）
      const url = `/api/standard-cards?page=1&pageSize=10000&keyword=${encodeURIComponent(
        keyword
      )}&status=${statusFilter}`;
      const response = await authFetch(url);
      const result = await response.json();
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = `standard-cards-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
        toast({ title: `导出成功，共 ${data.length} 条记录` });
      } else {
        toast({ title: result.message || '导出失败', variant: 'destructive' });
      }
    } catch (err) {
      console.error('导出失败:', err);
      toast({ title: '导出失败', variant: 'destructive' });
    }
  };

  // 返回列表
  const handleBackToList = () => {
    router.push('/sample/standard-card');
    setMode('list');
  };

  // 切换到新建模式
  const handleNewV2 = () => {
    router.push('/sample/standard-card');
    setMode('v2');
  };

  const handleNewCard = () => {
    router.push('/sample/standard-card');
    setMode('card');
  };

  // 渲染状态 Badge
  const renderStatusBadge = (status: number) => {
    const info = STATUS_MAP[status] || STATUS_MAP[1];
    return <Badge variant={STATUS_VARIANT[info.color] || 'secondary'}>{info.label}</Badge>;
  };

  // 格式化时间显示
  const formatTime = (time: string) => {
    if (!time) return '-';
    return time.replace('T', ' ').slice(0, 19);
  };

  // ========== 非列表模式：渲染录入表单 ==========
  if (mode === 'v2') {
    return (
      <MainLayout>
        <div className="container mx-auto py-4 max-w-7xl">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
            <span className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {isEdit ? '编辑标准卡（现代化录入）' : '新建标准卡（现代化录入）'}
            </span>
          </div>
          <InputV2Form />
        </div>
      </MainLayout>
    );
  }

  if (mode === 'card') {
    return (
      <MainLayout>
        <div className="container mx-auto py-4 max-w-7xl">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
            <span className="text-lg font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              {isEdit ? '编辑标准卡（A4 表格录入）' : '新建标准卡（A4 表格录入）'}
            </span>
          </div>
          <InputCardForm />
        </div>
      </MainLayout>
    );
  }

  // ========== 列表模式 ==========
  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-7xl">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">标准卡管理</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportClick} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? '导入中...' : '导入'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 两个录入按钮 */}
        <div className="flex items-center gap-3 mb-4">
          <Button onClick={handleNewV2}>
            <Sparkles className="h-4 w-4 mr-2" />
            新建标准卡
          </Button>
          <Button variant="outline" onClick={handleNewCard}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            传统录入
          </Button>
        </div>

        {/* 搜索栏 */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="搜索卡号/客户/品名"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="max-w-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="1">草稿</SelectItem>
                  <SelectItem value="2">已审核</SelectItem>
                  <SelectItem value="3">已确认</SelectItem>
                  <SelectItem value="4">已作废</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                搜索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-muted-foreground">加载中...</span>
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <span className="text-lg">暂无数据</span>
                <span className="text-sm mt-1">点击「新建标准卡」开始创建</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">卡片编号</th>
                      <th className="px-3 py-2 text-left font-medium">客户名称</th>
                      <th className="px-3 py-2 text-left font-medium">产品名称</th>
                      <th className="px-3 py-2 text-left font-medium">版本</th>
                      <th className="px-3 py-2 text-left font-medium">状态</th>
                      <th className="px-3 py-2 text-left font-medium">印刷类型</th>
                      <th className="px-3 py-2 text-left font-medium">创建时间</th>
                      <th className="px-3 py-2 text-left font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono">{item.card_no || '-'}</td>
                        <td className="px-3 py-2">{item.customer_name || '-'}</td>
                        <td className="px-3 py-2">{item.product_name || '-'}</td>
                        <td className="px-3 py-2">{item.version || '-'}</td>
                        <td className="px-3 py-2">{renderStatusBadge(item.status ?? 1)}</td>
                        <td className="px-3 py-2">{item.print_type || '-'}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatTime(item.create_time)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(item.id)}
                              title="查看"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item.id)}
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              title="删除"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {!loading && list.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  共 {total} 条记录，第 {page}/{totalPages || 1} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// 加载中占位组件
function Loading() {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    </MainLayout>
  );
}

// 默认导出：使用 Suspense 包装（因为使用了 useSearchParams）
export default function StandardCardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StandardCardPageContent />
    </Suspense>
  );
}
