'use client';

import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-700">启用</Badge>;
    case 'inactive':
      return <Badge className="bg-yellow-100 text-yellow-700">停用</Badge>;
    case 'discontinued':
      return <Badge className="bg-red-100 text-red-700">停产</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
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

export default function ProductsPage() {
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') { setSortField(null); setSortOrder(null); }
    } else { setSortField(field); setSortOrder('asc'); }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
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
      if (selectedCategory && selectedCategory !== 'all') params.append('categoryId', selectedCategory);

      const response = await fetch(`/api/products?${params}`);
      const result = await response.json();
      if (result.success || result.code === 200) {
        const list = result.data?.list || result.data || [];
        setProducts(Array.isArray(list) ? list : []);
        if (result.pagination) {
          setPagination(prev => ({
            ...prev,
            total: result.pagination.total || 0,
            totalPages: result.pagination.totalPages || Math.ceil((result.pagination.total || 0) / prev.pageSize),
          }));
        }
      } else {
        toast.error(result.message || '获取产品列表失败');
      }
    } catch (error) {
      console.error('获取产品列表失败:', error);
      toast.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, searchKeyword, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/products/categories');
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
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, selectedCategory]);

  const handleViewBom = async (product: Product) => {
    setSelectedProduct(product);
    setBomLoading(true);
    setIsBomOpen(true);
    try {
      const response = await fetch(`/api/orders/bom?productCode=${product.product_code}`);
      const result = await response.json();
      const bomList = result.data?.list || (Array.isArray(result.data) ? result.data : []);
      if (result.success && bomList.length > 0) {
        const bomId = bomList[0].id;
        const detailRes = await fetch(`/api/orders/bom/${bomId}`);
        const detailResult = await detailRes.json();
        if (detailResult.success) {
          setBomHeader(detailResult.data?.header || null);
          setBomLines(detailResult.data?.lines || []);
        } else {
          setBomHeader(null);
          setBomLines([]);
          toast.info('该产品暂无BOM数据');
        }
      } else {
        setBomHeader(null);
        setBomLines([]);
        toast.info('该产品暂无BOM数据');
      }
    } catch (error) {
      console.error('获取BOM失败:', error);
      toast.error('获取BOM数据失败');
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
      const response = await fetch(`/api/orders/bom?productCode=${product.product_code}`);
      const result = await response.json();
      const bomList = result.data?.list || (Array.isArray(result.data) ? result.data : []);
      if (result.success && bomList.length > 0) {
        const bomId = bomList[0].id;
        const detailRes = await fetch(`/api/orders/bom/${bomId}`);
        const detailResult = await detailRes.json();
        if (detailResult.success) {
          setBomHeader(detailResult.data?.header || null);
          setVersionHistory(detailResult.data?.version_history || []);
        } else {
          setBomHeader(null);
          setVersionHistory([]);
          toast.info('该产品暂无版本历史');
        }
      } else {
        setBomHeader(null);
        setVersionHistory([]);
        toast.info('该产品暂无版本历史');
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
      toast.error('获取版本历史失败');
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
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        toast.success('产品更新成功');
        setIsEditOpen(false);
        fetchProducts();
      } else {
        toast.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新产品失败:', error);
      toast.error('更新产品失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此产品吗？')) return;
    try {
      const response = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('产品已删除');
        fetchProducts();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <MainLayout title="产品档案">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder="搜索产品编码、名称..."
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  onSearch={() => fetchProducts()}
                  className="flex-1 max-w-sm"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="产品分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.category_name || c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新建产品
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>产品列表</CardTitle>
            <CardDescription>共 {pagination.total} 个产品</CardDescription>
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
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('product_code')}>
                      <span className="inline-flex items-center">编码{getSortIcon('product_code')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('product_name')}>
                      <span className="inline-flex items-center">产品名称{getSortIcon('product_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('specification')}>
                      <span className="inline-flex items-center">规格型号{getSortIcon('specification')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('unit')}>
                      <span className="inline-flex items-center">单位{getSortIcon('unit')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('category_name')}>
                      <span className="inline-flex items-center">分类{getSortIcon('category_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('bom_version')}>
                      <span className="inline-flex items-center">BOM版本{getSortIcon('bom_version')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        暂无产品数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.product_code}</TableCell>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.specification || '-'}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category_name || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.bom_version || '-'}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
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
                                查看BOM
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleViewVersion(product)}>
                                <History className="h-4 w-4 mr-2" />
                                版本历史
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEdit(product)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
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
                  上一页
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>新建产品</DialogTitle>
              <DialogDescription>填写产品基本信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品编码 *</Label>
                  <Input id="create_code" placeholder="如：P001" />
                </div>
                <div className="space-y-2">
                  <Label>产品分类 *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
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
                <Label>产品名称 *</Label>
                <Input id="create_name" placeholder="产品名称" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input id="create_spec" placeholder="规格描述" />
                </div>
                <div className="space-y-2">
                  <Label>计量单位</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="㎡">㎡</SelectItem>
                      <SelectItem value="张">张</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="卷">卷</SelectItem>
                      <SelectItem value="件">件</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>成本价</Label>
                  <Input id="create_cost" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>销售价</Label>
                  <Input id="create_sale" type="number" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input id="create_desc" placeholder="产品描述..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
              <Button onClick={async () => {
                const code = (document.getElementById('create_code') as HTMLInputElement)?.value;
                const name = (document.getElementById('create_name') as HTMLInputElement)?.value;
                if (!code || !name) {
                  toast.error('产品编码和名称不能为空');
                  return;
                }
                try {
                  const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      product_code: code,
                      product_name: name,
                      specification: (document.getElementById('create_spec') as HTMLInputElement)?.value,
                      cost_price: (document.getElementById('create_cost') as HTMLInputElement)?.value,
                      sale_price: (document.getElementById('create_sale') as HTMLInputElement)?.value,
                      description: (document.getElementById('create_desc') as HTMLInputElement)?.value,
                    }),
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast.success('产品创建成功');
                    setIsCreateOpen(false);
                    fetchProducts();
                  } else {
                    toast.error(result.message || '创建失败');
                  }
                } catch (error) {
                  toast.error('创建失败');
                }
              }}>保存</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>编辑产品</DialogTitle>
              <DialogDescription>修改产品信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品编码</Label>
                  <Input value={selectedProduct?.product_code || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>产品分类</Label>
                  <Select value={editForm.category_id} onValueChange={(v) => setEditForm(prev => ({ ...prev, category_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
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
                <Label>产品名称 *</Label>
                <Input value={editForm.product_name} onChange={(e) => setEditForm(prev => ({ ...prev, product_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input value={editForm.specification} onChange={(e) => setEditForm(prev => ({ ...prev, specification: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>计量单位</Label>
                  <Select value={editForm.unit} onValueChange={(v) => setEditForm(prev => ({ ...prev, unit: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择单位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="㎡">㎡</SelectItem>
                      <SelectItem value="张">张</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="卷">卷</SelectItem>
                      <SelectItem value="件">件</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>成本价</Label>
                  <Input type="number" value={editForm.cost_price} onChange={(e) => setEditForm(prev => ({ ...prev, cost_price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>销售价</Label>
                  <Input type="number" value={editForm.sale_price} onChange={(e) => setEditForm(prev => ({ ...prev, sale_price: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                      <SelectItem value="discontinued">停产</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>取消</Button>
              <Button onClick={handleSaveEdit}>保存</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isBomOpen} onOpenChange={setIsBomOpen}>
          <DialogContent className="max-w-4xl" resizable>
            <DialogHeader>
              <DialogTitle>BOM详情 - {selectedProduct?.product_name}</DialogTitle>
              <DialogDescription>
                {bomHeader ? `BOM编号: ${bomHeader.bom_no || '-'} | 版本: ${bomHeader.version || '-'} | 状态: ${bomHeader.status_name || '-'}` : '暂无BOM数据'}
              </DialogDescription>
            </DialogHeader>
            {bomLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bomHeader && bomLines.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">产品：</span>{bomHeader.product_name}</div>
                  <div><span className="text-muted-foreground">规格：</span>{bomHeader.product_spec || '-'}</div>
                  <div><span className="text-muted-foreground">基数：</span>{bomHeader.base_qty} {bomHeader.unit}</div>
                  <div><span className="text-muted-foreground">总成本：</span>¥{Number(bomHeader.total_cost || 0).toFixed(2)}</div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>行号</TableHead>
                      <TableHead>物料编码</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>用量</TableHead>
                      <TableHead>损耗率</TableHead>
                      <TableHead>实际用量</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>成本</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.line_no}</TableCell>
                        <TableCell className="font-mono">{line.material_code}</TableCell>
                        <TableCell className="font-medium">{line.material_name}</TableCell>
                        <TableCell>{line.material_spec || '-'}</TableCell>
                        <TableCell>{line.consumption_qty} {line.unit}</TableCell>
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
              <div className="text-center py-8 text-muted-foreground">该产品暂无BOM数据</div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isVersionOpen} onOpenChange={setIsVersionOpen}>
          <DialogContent className="max-w-3xl" resizable>
            <DialogHeader>
              <DialogTitle>版本历史 - {selectedProduct?.product_name}</DialogTitle>
              <DialogDescription>
                {bomHeader ? `当前版本: ${bomHeader.version || '-'} | BOM编号: ${bomHeader.bom_no || '-'}` : '暂无版本历史'}
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
                    <TableHead>版本</TableHead>
                    <TableHead>变更类型</TableHead>
                    <TableHead>变更内容</TableHead>
                    <TableHead>变更原因</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>操作时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionHistory.map((v, index) => (
                    <TableRow key={index}>
                      <TableCell><Badge variant="outline">{v.version}</Badge></TableCell>
                      <TableCell>
                        <Badge className={
                          v.change_type === 'CREATE' ? 'bg-green-100 text-green-700' :
                          v.change_type === 'PUBLISH' ? 'bg-blue-100 text-blue-700' :
                          v.change_type === 'DISABLE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {v.change_type === 'CREATE' ? '新建' :
                           v.change_type === 'PUBLISH' ? '发布' :
                           v.change_type === 'DISABLE' ? '停用' :
                           v.change_type === 'UPDATE' ? '更新' :
                           v.change_type === 'DELETE' ? '删除' : v.change_type}
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
              <div className="text-center py-8 text-muted-foreground">该产品暂无版本历史</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
