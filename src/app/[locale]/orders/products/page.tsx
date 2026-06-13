'use client';

import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  History,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  short_name: string;
  specification: string;
  unit: string;
  category_id: number;
  category_name: string;
  customer_id: number | null;
  customer_name: string;
  bom_version: string;
  description: string;
  status: string;
  cost_price: number;
  sale_price: number;
  create_time: string;
  update_time: string;
}

interface Category {
  id: number;
  category_code: string;
  category_name: string;
  categoryName?: string;
}

interface BomLine {
  id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  unit: string;
  consumption_qty: number;
  loss_rate: number;
  actual_qty: number;
  unit_cost: number;
  total_cost: number;
  material_type: string;
  is_key_material: number;
  remark: string;
}

interface BomVersion {
  version: string;
  change_type: string;
  change_content: string;
  change_reason: string;
  operator_name: string;
  operate_time: string;
}

const PRODUCT_STATUS_KEYS: Record<string, string> = {
  active: 'enabled',
  inactive: 'disabled',
  discontinued: 'discontinued',
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
};

const productStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  discontinued: 'bg-red-100 text-red-700',
};

export default function ProductsPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [bomHeader, setBomHeader] = useState<any>(null);
  const [versionHistory, setVersionHistory] = useState<BomVersion[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };
  const sortedProducts = useMemo(() => {
    if (!sortField || !sortOrder) return products;
    return [...products].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortField, sortOrder]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [editForm, setEditForm] = useState({
    product_name: '',
    short_name: '',
    specification: '',
    unit: '',
    category_id: '',
    status: 'active',
    cost_price: '',
    sale_price: '',
    description: '',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (selectedCategory && selectedCategory !== 'all')
        params.append('categoryId', selectedCategory);

      const response = await authFetch(`/api/products?${params}`);
      const result = await response.json();
      if (result.success || result.code === 200) {
        const list = result.data?.list || result.data || [];
        setProducts(Array.isArray(list) ? list : []);
        if (result.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: result.pagination.total || 0,
            totalPages:
              result.pagination.totalPages ||
              Math.ceil((result.pagination.total || 0) / prev.pageSize),
          }));
        }
      } else {
        toast.error(result.message || t('fetchProductListFailed'));
      }
    } catch (error) {
      console.error(t('fetchProductListFailed'), error);
      toast.error(t('fetchProductListFailed'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, searchKeyword, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await authFetch('/api/products/categories');
      const result = await response.json();
      if (result.success || result.code === 200) {
        setCategories(result.data || []);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, selectedCategory]);

  const handleViewBom = async (product: Product) => {
    setSelectedProduct(product);
    setBomLoading(true);
    setIsBomOpen(true);
    try {
      const response = await authFetch(`/api/orders/bom?productCode=${product.product_code}`);
      const result = await response.json();
      const bomList = result.data?.list || (Array.isArray(result.data) ? result.data : []);
      if (result.success && bomList.length > 0) {
        const bomId = bomList[0].id;
        const detailRes = await authFetch(`/api/orders/bom/${bomId}`);
        const detailResult = await detailRes.json();
        if (detailResult.success) {
          setBomHeader(detailResult.data?.header || null);
          setBomLines(detailResult.data?.lines || []);
        } else {
          setBomHeader(null);
          setBomLines([]);
          toast.info(t('noBomDataForProduct'));
        }
      } else {
        setBomHeader(null);
        setBomLines([]);
        toast.info(t('noBomDataForProduct'));
      }
    } catch (error) {
      console.error(t('fetchBomFailed'), error);
      toast.error(t('fetchBomFailed'));
      setBomHeader(null);
      setBomLines([]);
    } finally {
      setBomLoading(false);
    }
  };

  const handleViewVersion = async (product: Product) => {
    setSelectedProduct(product);
    setBomLoading(true);
    setIsVersionOpen(true);
    try {
      const response = await authFetch(`/api/orders/bom?productCode=${product.product_code}`);
      const result = await response.json();
      const bomList = result.data?.list || (Array.isArray(result.data) ? result.data : []);
      if (result.success && bomList.length > 0) {
        const bomId = bomList[0].id;
        const detailRes = await authFetch(`/api/orders/bom/${bomId}`);
        const detailResult = await detailRes.json();
        if (detailResult.success) {
          setBomHeader(detailResult.data?.header || null);
          setVersionHistory(detailResult.data?.version_history || []);
        } else {
          setBomHeader(null);
          setVersionHistory([]);
          toast.info(t('noVersionHistory'));
        }
      } else {
        setBomHeader(null);
        setVersionHistory([]);
        toast.info(t('noVersionHistory'));
      }
    } catch (error) {
      console.error(t('fetchVersionHistoryFailed'), error);
      toast.error(t('fetchVersionHistoryFailed'));
      setBomHeader(null);
      setVersionHistory([]);
    } finally {
      setBomLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      product_name: product.product_name || '',
      short_name: product.short_name || '',
      specification: product.specification || '',
      unit: product.unit || '',
      category_id: product.category_id ? String(product.category_id) : '',
      status: product.status || 'active',
      cost_price: product.cost_price ? String(product.cost_price) : '',
      sale_price: product.sale_price ? String(product.sale_price) : '',
      description: product.description || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    try {
      const response = await authFetch('/api/products', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedProduct.id,
          product_name: editForm.product_name,
          short_name: editForm.short_name,
          specification: editForm.specification,
          unit: editForm.unit,
          category_id: editForm.category_id ? parseInt(editForm.category_id) : undefined,
          status: editForm.status,
          cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : undefined,
          sale_price: editForm.sale_price ? parseFloat(editForm.sale_price) : undefined,
          description: editForm.description,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('productUpdateSuccess'));
        setIsEditOpen(false);
        fetchProducts();
      } else {
        toast.error(result.message || t('updateFailed'));
      }
    } catch (error) {
      console.error(t('productUpdateFailed'), error);
      toast.error(t('productUpdateFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteProduct'))) return;
    try {
      const response = await authFetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success(t('productDeleteSuccess'));
        fetchProducts();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch (error) {
      toast.error(tc('deleteFailed'));
    }
  };

  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.style.padding = '20px';

    const title = document.createElement('h2');
    title.textContent = t('productArchiveList');
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    printContent.appendChild(title);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // 安全创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f3f4f6';
    const headers = [
      t('productCode'),
      t('productName'),
      t('specification'),
      t('unit'),
      t('category'),
      t('bomVersion'),
      tc('status'),
      t('costPrice'),
      t('salePrice'),
    ];
    headers.forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.border = '1px solid #d1d5db';
      th.style.padding = '8px';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 安全创建数据行
    const tbody = document.createElement('tbody');
    sortedProducts.forEach((product) => {
      const row = document.createElement('tr');
      const cells = [
        product.product_code,
        product.product_name,
        product.specification || '-',
        product.unit,
        product.category_name || '-',
        product.bom_version || '-',
        tc(PRODUCT_STATUS_KEYS[product.status] || 'unknown'),
        `¥${Number(product.cost_price || 0).toFixed(2)}`,
        `¥${Number(product.sale_price || 0).toFixed(2)}`,
      ];
      cells.forEach((text) => {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.border = '1px solid #d1d5db';
        td.style.padding = '8px';
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    printContent.appendChild(table);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t('productArchivePrint')}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
        </body>
        </html>
      `);
      printWindow.document.body.appendChild(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === sortedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(sortedProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <MainLayout title={t('productArchive')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchProductPlaceholder')}
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  onSearch={() => fetchProducts()}
                  className="flex-1 max-w-sm"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('productCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.category_name || c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                </Button>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newProduct')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('productList')}</CardTitle>
            <CardDescription>{tc('total', { count: pagination.total })}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          sortedProducts.length > 0 &&
                          selectedProducts.length === sortedProducts.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('product_code')}
                    >
                      <span className="inline-flex items-center">
                        {t('productCode')}{getSortIcon('product_code')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('product_name')}
                    >
                      <span className="inline-flex items-center">
                        {t('productName')}{getSortIcon('product_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('specification')}
                    >
                      <span className="inline-flex items-center">
                        {t('specification')}{getSortIcon('specification')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('unit')}
                    >
                      <span className="inline-flex items-center">{t('unit')}{getSortIcon('unit')}</span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('category_name')}
                    >
                      <span className="inline-flex items-center">
                        {t('category')}{getSortIcon('category_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('bom_version')}
                    >
                      <span className="inline-flex items-center">
                        {t('bomVersion')}{getSortIcon('bom_version')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">{tc('status')}{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="text-right">{tc('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t('noProductData')}
                    </TableCell>
                    </TableRow>
                  ) : (
                    sortedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => toggleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{product.product_code}</TableCell>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.specification || '-'}
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category_name || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.bom_version || '-'}</Badge>
                        </TableCell>
                        <TableCell>
          <Badge className={productStatusColors[product.status] || ''}>
            {tc(PRODUCT_STATUS_KEYS[product.status] || 'unknown')}
          </Badge>
        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleViewBom(product)}>
                                <Package className="h-4 w-4 mr-2" />
                                {t('viewBom')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleViewVersion(product)}>
                                <History className="h-4 w-4 mr-2" />
                                {t('versionHistory')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEdit(product)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tc('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  {tc('prevPage')}
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {t('pageInfo', { page: pagination.page, total: pagination.totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('newProduct')}</DialogTitle>
              <DialogDescription>{t('fillProductBasicInfo')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('productCode')} *</Label>
                  <Input id="create_code" placeholder={t('productCodeExample')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('productCategory')} *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.category_name || c.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('productName')} *</Label>
                <Input id="create_name" placeholder={t('productName')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('specification')}</Label>
                  <Input id="create_spec" placeholder={t('specDescription')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('measurementUnit')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectUnit')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="㎡">㎡</SelectItem>
                      <SelectItem value="张">{t('unitSheet')}</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="卷">{t('unitRoll')}</SelectItem>
                      <SelectItem value="件">{t('unitPiece')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('costPrice')}</Label>
                  <Input id="create_cost" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>{t('salePrice')}</Label>
                  <Input id="create_sale" type="number" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Input id="create_desc" placeholder={t('productDescription')} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={async () => {
                  const code = (document.getElementById('create_code') as HTMLInputElement)?.value;
                  const name = (document.getElementById('create_name') as HTMLInputElement)?.value;
                  if (!code || !name) {
                    toast.error(t('productCodeNameRequired2'));
                    return;
                  }
                  try {
                    const response = await authFetch('/api/products', {
                      method: 'POST',
                      body: JSON.stringify({
                        product_code: code,
                        product_name: name,
                        specification: (document.getElementById('create_spec') as HTMLInputElement)
                          ?.value,
                        cost_price: (document.getElementById('create_cost') as HTMLInputElement)
                          ?.value,
                        sale_price: (document.getElementById('create_sale') as HTMLInputElement)
                          ?.value,
                        description: (document.getElementById('create_desc') as HTMLInputElement)
                          ?.value,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success(t('productCreateSuccess'));
                      setIsCreateOpen(false);
                      fetchProducts();
                    } else {
                      toast.error(result.message || t('createFailed'));
                    }
                  } catch (error) {
                    toast.error(t('createFailed'));
                  }
                }}
              >
                {tc('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('editProduct')}</DialogTitle>
              <DialogDescription>{t('modifyProductInfo')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('productCode')}</Label>
                  <Input value={selectedProduct?.product_code || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('productCategory')}</Label>
                  <Select
                    value={editForm.category_id}
                    onValueChange={(v) => setEditForm((prev) => ({ ...prev, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.category_name || c.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('productName')} *</Label>
                <Input
                  value={editForm.product_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, product_name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('specification')}</Label>
                  <Input
                    value={editForm.specification}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, specification: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('measurementUnit')}</Label>
                  <Select
                    value={editForm.unit}
                    onValueChange={(v) => setEditForm((prev) => ({ ...prev, unit: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectUnit')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="㎡">㎡</SelectItem>
                      <SelectItem value="张">{t('unitSheet')}</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="卷">{t('unitRoll')}</SelectItem>
                      <SelectItem value="件">{t('unitPiece')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('costPrice')}</Label>
                  <Input
                    type="number"
                    value={editForm.cost_price}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, cost_price: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('salePrice')}</Label>
                  <Input
                    type="number"
                    value={editForm.sale_price}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, sale_price: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc('status')}</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{tc('enabled')}</SelectItem>
                      <SelectItem value="inactive">{tc('disabled')}</SelectItem>
                      <SelectItem value="discontinued">{t('discontinued')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSaveEdit}>{tc('save')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isBomOpen} onOpenChange={setIsBomOpen}>
          <DialogContent className="max-w-4xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('bomDetail')} - {selectedProduct?.product_name}</DialogTitle>
              <DialogDescription>
                {bomHeader
                  ? `${t('bomNo')}: ${bomHeader.bom_no || '-'} | ${t('version')}: ${bomHeader.version || '-'} | ${tc('status')}: ${bomHeader.status_name || '-'}`
                  : t('noBomDataForProduct')}
              </DialogDescription>
            </DialogHeader>
            {bomLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bomHeader && bomLines.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('product')}：</span>
                    {bomHeader.product_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('specification')}：</span>
                    {bomHeader.product_spec || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('baseQty')}：</span>
                    {bomHeader.base_qty} {bomHeader.unit}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('totalCost')}：</span>¥
                    {Number(bomHeader.total_cost || 0).toFixed(2)}
                  </div>
                </div>
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
                      <TableHead>{t('unitPrice')}</TableHead>
                      <TableHead>{t('cost')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.line_no}</TableCell>
                        <TableCell className="font-mono">{line.material_code}</TableCell>
                        <TableCell className="font-medium">{line.material_name}</TableCell>
                        <TableCell>{line.material_spec || '-'}</TableCell>
                        <TableCell>
                          {line.consumption_qty} {line.unit}
                        </TableCell>
                        <TableCell>{line.loss_rate}%</TableCell>
                        <TableCell>{Number(line.actual_qty).toFixed(4)}</TableCell>
                        <TableCell>¥{Number(line.unit_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>¥{Number(line.total_cost || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noBomDataForProduct')}</div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isVersionOpen} onOpenChange={setIsVersionOpen}>
          <DialogContent className="max-w-3xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('versionHistory')} - {selectedProduct?.product_name}</DialogTitle>
              <DialogDescription>
                {bomHeader
                  ? `${t('currentVersion')}: ${bomHeader.version || '-'} | ${t('bomNo')}: ${bomHeader.bom_no || '-'}`
                  : t('noVersionHistory')}
              </DialogDescription>
            </DialogHeader>
            {bomLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : versionHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('version')}</TableHead>
                    <TableHead>{t('changeType')}</TableHead>
                    <TableHead>{t('changeContent')}</TableHead>
                    <TableHead>{t('changeReason')}</TableHead>
                    <TableHead>{t('operator')}</TableHead>
                    <TableHead>{t('operateTime')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionHistory.map((v, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{v.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            v.change_type === 'CREATE'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : v.change_type === 'PUBLISH'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : v.change_type === 'DISABLE'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }
                        >
                          {v.change_type === 'CREATE'
                            ? t('changeTypeCreate')
                            : v.change_type === 'PUBLISH'
                              ? t('changeTypePublish')
                              : v.change_type === 'DISABLE'
                                ? t('changeTypeDisable')
                                : v.change_type === 'UPDATE'
                                  ? t('changeTypeUpdate')
                                  : v.change_type === 'DELETE'
                                    ? tc('delete')
                                    : v.change_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{v.change_content}</TableCell>
                      <TableCell>{v.change_reason || '-'}</TableCell>
                      <TableCell>{v.operator_name || '-'}</TableCell>
                      <TableCell>{formatDate(v.operate_time)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noVersionHistory')}</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
