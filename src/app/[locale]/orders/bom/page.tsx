'use client';

import { authFetch } from '@/lib/auth-fetch';
import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Package,
  Layers,
  MoreHorizontal,
} from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToastContext } from '@/components/ui/toast';
import { MainLayout } from '@/components/layout/main-layout';
import { useTranslations } from 'next-intl';

interface BOMItem {
  id: number;
  bom_no: string;
  product_code: string;
  product_name: string;
  product_spec: string;
  version: string;
  is_default: number;
  status: number;
  status_name: string;
  unit: string;
  base_qty: number;
  total_material_count: number;
  total_cost: number;
  remark: string;
  create_time: string;
  update_time: string;
}

const statusMap: Record<number, { labelKey: string; color: string }> = {
  10: { labelKey: 'draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  20: {
    labelKey: 'approved',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  30: {
    labelKey: 'published',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  90: { labelKey: 'disabled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const getStatusLabel = (status: number, t: (k: string) => string, tc: (k: string) => string) => {
  const key = statusMap[status]?.labelKey;
  if (!key) return tc('unknown');
  if (key === 'draft' || key === 'approved' || key === 'disabled') return tc(key);
  return t(key);
};

export default function BOMPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');

  const router = useRouter();
  const { addToast: toast } = useToastContext();
  const [bomList, setBomList] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bomDetail, setBomDetail] = useState<any>(null);

  const fetchBOMList = async (overridePage?: number) => {
    try {
      setLoading(true);
      const pageToUse = overridePage ?? currentPage;
      const params = new URLSearchParams({
        page: pageToUse.toString(),
        pageSize: '20',
      });
      if (searchKeyword) params.append('keyword', searchKeyword);

      const res = await authFetch(`/api/orders/bom?${params}`);
      const data = await res.json();

      if (data.success) {
        const bomList = Array.isArray(data.data) ? data.data : data.data?.list || [];
        setBomList(bomList);
        const total = data.data?.total || 0;
        setTotalPages(Math.ceil(total / 20) || 1);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchBomFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('fetchBomFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBOMDetail = async (id: number) => {
    try {
      const res = await authFetch(`/api/orders/bom/${id}`);
      const data = await res.json();

      if (data.success) {
        setBomDetail(data.data);
        setDetailDialogOpen(true);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchBomDetailFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('fetchBomDetailFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteBom'))) return;

    try {
      const res = await authFetch(`/api/orders/bom?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: tc('success'),
          description: t('deleteBomSuccess'),
        });
        fetchBOMList();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('deleteFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: number, action: string) => {
    try {
      const res = await authFetch('/api/orders/bom', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: tc('success'),
          description:
            action === 'audit'
              ? t('auditSuccess')
              : action === 'publish'
                ? t('publishSuccess')
                : t('disableSuccess'),
        });
        fetchBOMList();
      } else {
        toast({
          title: '错误',
          description: data.message || tc('error'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: '错误',
        description: tc('error'),
        variant: 'destructive',
      });
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBOMList(1);
  };

  useEffect(() => {
    fetchBOMList();
  }, [currentPage]);

  return (
    <MainLayout title={t('bomManagement')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('bomManagement')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('bomListManagement')}</p>
            </div>
          </div>
          <Button onClick={() => router.push('/orders/bom/create')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newBom')}
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchBom')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            {tc('search')}
          </Button>
        </div>

        <div className="rounded-lg border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bomNo')}</TableHead>
                <TableHead>{t('productInfo')}</TableHead>
                <TableHead>{t('version')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{t('materialCount')}</TableHead>
                <TableHead>{t('totalCost')}</TableHead>
                <TableHead>{tc('createTime')}</TableHead>
                <TableHead className="text-right">{tc('operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {tc('loading')}
                  </TableCell>
                </TableRow>
              ) : bomList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    {t('noBomData')}
                  </TableCell>
                </TableRow>
              ) : (
                bomList.map((bom) => (
                  <TableRow key={bom.id}>
                    <TableCell className="font-medium">{bom.bom_no}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bom.product_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {bom.product_code}
                        </div>
                        {bom.product_spec && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {bom.product_spec}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{bom.version}</span>
                        {bom.is_default === 1 && (
                          <Badge variant="default" className="text-xs">
                            {t('default')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusMap[bom.status]?.color || 'bg-gray-100 dark:bg-gray-700'}
                      >
                        {getStatusLabel(bom.status, t, tc)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bom.total_material_count} {t('itemsUnit')}
                    </TableCell>
                    <TableCell>¥{Number(bom.total_cost || 0).toFixed(4)}</TableCell>
                    <TableCell>{new Date(bom.create_time).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => fetchBOMDetail(bom.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewDetail')}
                          </DropdownMenuItem>
                          {bom.status === 10 && (
                            <DropdownMenuItem onClick={() => handleStatusChange(bom.id, 'audit')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('audit')}
                            </DropdownMenuItem>
                          )}
                          {bom.status === 20 && (
                            <DropdownMenuItem onClick={() => handleStatusChange(bom.id, 'publish')}>
                              <FileText className="w-4 h-4 mr-2" />
                              {t('publish')}
                            </DropdownMenuItem>
                          )}
                          {bom.status === 30 && (
                            <DropdownMenuItem onClick={() => handleStatusChange(bom.id, 'disable')}>
                              <XCircle className="w-4 h-4 mr-2" />
                              {t('disable')}
                            </DropdownMenuItem>
                          )}
                          {bom.status < 30 && (
                            <DropdownMenuItem
                              onClick={() => router.push(`/orders/bom/edit/${bom.id}`)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {tc('edit')}
                            </DropdownMenuItem>
                          )}
                          {bom.status < 30 && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(bom.id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {tc('delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {tc('prevPage')}
            </Button>
            <span className="flex items-center px-4">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {tc('nextPage')}
            </Button>
          </div>
        )}

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('bomDetail')}</DialogTitle>
            </DialogHeader>
            {bomDetail && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('bomNo')}</label>
                    <div className="font-medium">{bomDetail.header.bom_no}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('version')}
                    </label>
                    <div className="font-medium">{bomDetail.header.version}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('productName')}
                    </label>
                    <div className="font-medium">{bomDetail.header.product_name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('productCode')}
                    </label>
                    <div className="font-medium">{bomDetail.header.product_code}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {tc('status')}
                    </label>
                    <div>
                      <Badge className={statusMap[bomDetail.header.status]?.color}>
                        {bomDetail.header.status_name}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('totalCost')}
                    </label>
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      ¥{parseFloat(bomDetail.header.total_cost || 0).toFixed(4)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {t('bomDetailInfo', { count: bomDetail.lines?.length || 0 })}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('lineNo')}</TableHead>
                        <TableHead>{t('materialCode')}</TableHead>
                        <TableHead>{t('materialName')}</TableHead>
                        <TableHead>{t('spec')}</TableHead>
                        <TableHead>{t('consumption')}</TableHead>
                        <TableHead>{t('lossRate')}</TableHead>
                        <TableHead>{t('actualUsage')}</TableHead>
                        <TableHead>{t('cost')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomDetail.lines?.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.line_no}</TableCell>
                          <TableCell>{line.material_code}</TableCell>
                          <TableCell>{line.material_name}</TableCell>
                          <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                            {line.material_spec}
                          </TableCell>
                          <TableCell>
                            {line.consumption_qty} {line.unit}
                          </TableCell>
                          <TableCell>{line.loss_rate}%</TableCell>
                          <TableCell>
                            {parseFloat(String(line.actual_qty || 0)).toFixed(4)}
                          </TableCell>
                          <TableCell>
                            ¥{parseFloat(String(line.total_cost || 0)).toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
