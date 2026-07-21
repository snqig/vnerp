'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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
  Trash2,
  ArrowLeft,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

const STATUS_MAP: Record<number, { labelKey: string; color: 'gray' | 'blue' | 'green' | 'red' }> = {
  1: { labelKey: 'draft', color: 'gray' },
  2: { labelKey: 'reviewed', color: 'blue' },
  3: { labelKey: 'confirmed', color: 'green' },
  4: { labelKey: 'invalid', color: 'red' },
};

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
  const t = useTranslations('StandardCard');
  const tc = useTranslations('Common');

  // 从 URL 参数初始化模式，支持 mode=card / mode=v2
  const urlMode = searchParams.get('mode');
  const [mode, setMode] = useState<'list' | 'v2' | 'card'>(
    urlMode === 'v2' ? 'v2' : urlMode === 'card' ? 'card' : 'list'
  );
  const _editId = searchParams.get('id');
  const isEdit = searchParams.get('edit') === 'true';

  const [list, setList] = useState<Loose[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // URL mode 参数变化时同步组件状态
  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'v2') setMode('v2');
    else if (m === 'card') setMode('card');
    else if (!m) setMode('list');
  }, [searchParams]);

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
        if (Array.isArray(data)) {
          setList(data);
          setTotal(data.length);
          setTotalPages(Math.ceil(data.length / pageSize));
        } else if (data && Array.isArray(data.list)) {
          setList(data.list);
          setTotal(data.total || 0);
          setTotalPages(Math.ceil((data.total || 0) / pageSize));
        } else {
          setList([]);
          setTotal(0);
          setTotalPages(0);
        }
      } else {
        toast({ title: result.message || t('getListFailed'), variant: 'destructive' });
      }
    } catch (e) {
      console.error('fetchList error:', e);
      toast({ title: t('getListFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, toast, t]);

  useEffect(() => {
    if (mode === 'list') {
      fetchList();
    }
  }, [mode, page, statusFilter, fetchList]);

  const handleSearch = () => {
    setPage(1);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('confirmDeleteMsg'))) return;
    try {
      const response = await authFetch(`/api/standard-cards?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchList();
      } else {
        toast({ title: result.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch (e) {
      console.error('delete error:', e);
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleToggleAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((i) => i.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确认删除选中的 ${selectedIds.length} 条标准卡吗？`)) return;
    try {
      const response = await authFetch(`/api/standard-cards?id=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: `已删除 ${selectedIds.length} 条记录` });
        setSelectedIds([]);
        fetchList();
      } else {
        toast({ title: result.message || '批量删除失败', variant: 'destructive' });
      }
    } catch (e) {
      console.error('batch delete error:', e);
      toast({ title: '批量删除失败', variant: 'destructive' });
    }
  };

  const handleView = (id: number) => {
    router.push(`/sample/standard-card/print?id=${id}`);
  };

  // V2 模式编辑
  // 注意：不手动 setMode，router.push 改变 URL 后 useEffect 会自动同步 mode。
  // 手动 setMode 会导致重渲染中断 RSC fetch，触发 net::ERR_ABORTED。
  const handleEdit = (id: number) => {
    router.push(`/sample/standard-card?id=${id}&edit=true&mode=v2`);
  };

  // 传统录入模式编辑
  const handleEditCard = (id: number) => {
    router.push(`/sample/standard-card?id=${id}&edit=true&mode=card`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const records = JSON.parse(text);
      if (!Array.isArray(records)) {
        toast({ title: t('fileFormatError'), variant: 'destructive' });
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
        title: t('importResult', { success: successCount, fail: failCount }),
      });
      fetchList();
    } catch (err) {
      console.error('import error:', err);
      toast({ title: t('importParseError'), variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const url = `/api/standard-cards?page=1&pageSize=10000&keyword=${encodeURIComponent(
        keyword
      )}&status=${statusFilter}`;
      const response = await authFetch(url);
      const result = await response.json();
      if (result.success) {
        const raw = result.data;
        const data = Array.isArray(raw) ? raw : raw && Array.isArray(raw.list) ? raw.list : [];
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
        toast({ title: t('exportResult', { count: data.length }) });
      } else {
        toast({ title: result.message || tc('exportFailed'), variant: 'destructive' });
      }
    } catch (err) {
      console.error('export error:', err);
      toast({ title: tc('exportFailed'), variant: 'destructive' });
    }
  };

  const handleBackToList = () => {
    router.push('/sample/standard-card?mode=list');
  };

  const handleNewV2 = () => {
    router.push('/sample/standard-card?mode=v2');
  };

  const handleNewCard = () => {
    router.push('/sample/standard-card?mode=card');
  };

  const renderStatusBadge = (status: number) => {
    const info = STATUS_MAP[status] || STATUS_MAP[1];
    return <Badge variant={STATUS_VARIANT[info.color] || 'secondary'}>{t(info.labelKey)}</Badge>;
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    return time.replace('T', ' ').slice(0, 19);
  };

  if (mode === 'v2') {
    return (
      <MainLayout>
        <div className="container mx-auto py-4 max-w-7xl">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToList')}
            </Button>
            <span className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {isEdit ? t('editV2Mode') : t('newV2Mode')}
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
              {t('backToList')}
            </Button>
            <span className="text-lg font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              {isEdit ? t('editCardMode') : t('newCardMode')}
            </span>
          </div>
          <InputCardForm />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('management')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportClick} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? t('importing') : tc('import')}
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
              {tc('export')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Button onClick={handleNewV2}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('newCardBtn')}
          </Button>
          <Button variant="outline" onClick={handleNewCard}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('traditionalInput')}
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBatchDelete} className="ml-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除 ({selectedIds.length})
            </Button>
          )}
        </div>

        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder={t('searchCardPlaceholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="max-w-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="1">{t('draft')}</SelectItem>
                  <SelectItem value="2">{t('reviewed')}</SelectItem>
                  <SelectItem value="3">{t('confirmed')}</SelectItem>
                  <SelectItem value="4">{t('invalid')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-muted-foreground">{tc('loading')}</span>
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <span className="text-lg">{t('noData')}</span>
                <span className="text-sm mt-1">{t('clickToCreate')}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={list.length > 0 && selectedIds.length === list.length}
                          onChange={handleToggleAll}
                          aria-label="全选"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('cardNoCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('customerCodeCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('customerCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('productNameCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('versionCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('finishedSize')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('printType')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('materialTypeCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('statusCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('creator')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {tc('createTime')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('actionCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleToggle(item.id)}
                            aria-label={`选择 ${item.card_no}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {item.card_no || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.customer_code || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.customer_name || '-'}</td>
                        <td className="px-3 py-2">{item.product_name || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.version || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.finished_size || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.print_type || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.material_type || '-'}</td>
                        <td className="px-3 py-2">{renderStatusBadge(item.status ?? 1)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.creator || '-'}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {formatTime(item.create_time)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleView(item.id)}
                              title={tc('view')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item.id)}
                              title={t('editV2Mode')}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCard(item.id)}
                              title={t('editCardMode')}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              title={tc('delete')}
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

            {!loading && list.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {t('pageInfo', { total, page, totalPages: totalPages || 1 })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    {tc('prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    {tc('nextPage')}
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

function Loading() {
  const tc = useTranslations('Common');
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">{tc('loading')}</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function StandardCardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StandardCardPageContent />
    </Suspense>
  );
}
