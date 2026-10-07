'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';

interface Item {
  id: number;
  notice_title: string;
  notice_type: number;
  notice_content: string;
  status: number;
  create_time: string;
}
export default function NoticePage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');
  const typeMap: Record<number, string> = {
    1: tc('notice'),
    2: tc('announcement'),
    3: tc('warning'),
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const doJump = () => {
    const n = Number(jumpValue);
    if (!jumpValue || isNaN(n) || n < 1 || n > totalPages) {
      setJumpError(tStd('invalidPage', { max: totalPages }));
      return;
    }
    setJumpError(null);
    setPage(n);
  };
  const [searchTitle, setSearchTitle] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        noticeTitle: searchTitle,
      });
      const res = await authFetch('/api/system/notice?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setTotalPages(Math.ceil((result.data.total || 0) / pageSize));
      }
    } catch {}
  };
  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/system/notice', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/system/notice?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('noticeAnnouncement')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchTitle')}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addNotice')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tc('title')}</TableHead>
                  <TableHead className="text-xs">{tc('type')}</TableHead>
                  <TableHead className="text-xs">{tc('content')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('createdAt')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.notice_title}</TableCell>
                    <TableCell className="text-xs">{typeMap[item.notice_type] || '-'}</TableCell>
                    <TableCell className="text-xs max-w-64 truncate">
                      {item.notice_content || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 1 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status === 1 ? tc('published') : tc('draft')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{item.create_time || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditItem(item);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                      {tc('noRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {total > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {tStd('paginationSummary', { total, pages: totalPages })}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{tStd('prevPage')}</Button>
              <span className="text-sm">{tStd('pageNumber', { page, pages: totalPages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>{tStd('nextPage')}</Button>
              <div className="flex items-center gap-1">
                <Input className="w-[70px]" value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page, pages: totalPages })} onKeyDown={(e) => { if (e.key === 'Enter') doJump(); }} />
                <Button variant="outline" size="sm" onClick={doJump}>{tStd('jump')}</Button>
              </div>
            </div>
          </div>
        )}
        {jumpError && <p className="text-destructive text-sm mt-2">{jumpError}</p>}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addNoticeAnnouncement')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{tc('title')}</Label>
                <Input
                  value={editItem.notice_title || ''}
                  onChange={(e) => setEditItem({ ...editItem, notice_title: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('type')}</Label>
                <Select
                  value={String(editItem.notice_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, notice_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('notice')}</SelectItem>
                    <SelectItem value="2">{tc('announcement')}</SelectItem>
                    <SelectItem value="3">{tc('warning')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tc('content')}</Label>
                <textarea
                  className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                  value={editItem.notice_content || ''}
                  onChange={(e) => setEditItem({ ...editItem, notice_content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
