'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Edit,
  Trash2,
  MoreHorizontal,
  Warehouse,
  Building2,
  Package,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

// 仓库数据类型
interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: 'raw' | 'finished' | 'semi' | 'scrap' | 'other';
  nature: 'own' | 'rented' | 'virtual';
  includeInCalculation: boolean;
  address: string;
  manager: string;
  contact: string;
  capacity: number;
  usedCapacity: number;
  status: 'active' | 'inactive';
  remark: string;
  createTime: string;
}

// 仓库类型选项
const warehouseTypes = [
  { value: 'raw', labelKey: 'raw', icon: Package },
  { value: 'finished', labelKey: 'finished', icon: Archive },
  { value: 'semi', labelKey: 'semi', icon: Building2 },
  { value: 'scrap', labelKey: 'scrap', icon: AlertCircle },
  { value: 'other', labelKey: 'other', icon: Warehouse },
];

// 仓库性质选项
const warehouseNatures = [
  { value: 'own', labelKey: 'own' },
  { value: 'rented', labelKey: 'rented' },
  { value: 'virtual', labelKey: 'virtual' },
];

export default function WarehouseSetupPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Warehouse>>({
    code: '',
    name: '',
    type: 'raw',
    nature: 'own',
    includeInCalculation: true,
    address: '',
    manager: '',
    contact: '',
    capacity: 0,
    remark: '',
    status: 'active',
  });

  // 获取仓库列表
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchKeyword) params.append('keyword', searchKeyword);

      const response = await authFetch(`/api/warehouse?${params}`);
      const result = await response.json();

      if (result.success) {
        setWarehouses(result.data?.list || result.data || []);
      } else {
        toast.error(result.message || t('fetchWarehouseFailed'));
      }
    } catch (err) {
      toast.error(t('fetchWarehouseFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // 搜索时重新加载
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWarehouses();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 获取仓库类型标签
  const getTypeLabel = (type: string) => {
    const typeInfo = warehouseTypes.find((t) => t.value === type);
    return typeInfo ? t(typeInfo.labelKey) : type;
  };

  // 获取仓库性质标签
  const getNatureLabel = (nature: string) => {
    const natureInfo = warehouseNatures.find((n) => n.value === nature);
    return natureInfo ? t(natureInfo.labelKey) : nature;
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      type: 'raw',
      nature: 'own',
      includeInCalculation: true,
      address: '',
      manager: '',
      contact: '',
      capacity: 0,
      remark: '',
      status: 'active',
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({ ...warehouse });
    setIsDialogOpen(true);
  };

  // 打开删除对话框
  const handleDeleteClick = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (warehouseToDelete) {
      try {
        const response = await authFetch(`/api/warehouse?id=${warehouseToDelete.id}`, {
          method: 'DELETE',
        });
        const result = await response.json();

        if (result.success) {
          toast.success(t('warehouseDeleteSuccess', { name: warehouseToDelete.name }));
          setIsDeleteDialogOpen(false);
          fetchWarehouses();
        } else {
          toast.error(result.message || t('deleteFailed'));
        }
      } catch (err) {
        toast.error(t('deleteFailed'));
      }
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t('fillCodeAndName'));
      return;
    }

    try {
      const url = '/api/warehouse';
      const method = editingWarehouse ? 'PUT' : 'POST';
      const body = editingWarehouse ? { ...formData, id: editingWarehouse.id } : formData;

      const response = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingWarehouse ? t('warehouseUpdated') : t('warehouseCreated'));
        setIsDialogOpen(false);
        fetchWarehouses();
      } else {
        toast.error(result.message || t('saveFailed'));
      }
    } catch (err) {
      toast.error(t('saveFailed'));
    }
  };

  return (
    <MainLayout title={t('warehouseSetup')}>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              {t('warehouseSetup')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('warehouseSetupDesc')}</p>
          </div>
          <Button onClick={handleAdd} className="btn-dashboard-primary">
            <Plus className="h-4 w-4 mr-2" />
            {t('addWarehouse')}
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalWarehouses')}</p>
                  <p className="text-2xl font-bold">{warehouses.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Warehouse className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('activeWarehouses')}</p>
                  <p className="text-2xl font-bold">
                    {warehouses.filter((w) => w.status === 'active').length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('includedInCalc')}</p>
                  <p className="text-2xl font-bold">
                    {warehouses.filter((w) => w.includeInCalculation).length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tc("totalCapacity")}</p>
                  <p className="text-2xl font-bold">
                    {(warehouses.reduce((sum, w) => sum + w.capacity, 0) / 1000).toFixed(1)}k
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Archive className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 仓库列表 */}
        <Card className="card-dashboard">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('warehouseList')}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchWarehousePlaceholder')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('nature')}</TableHead>
                  <TableHead>{t('typeLabel')}</TableHead>
                  <TableHead>{t('includedInCalc')}</TableHead>
                  <TableHead>{t('capacityUsage')}</TableHead>
                  <TableHead>{tc("responsiblePerson")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      暂无仓库数据
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">{warehouse.code}</TableCell>
                      <TableCell>{warehouse.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getNatureLabel(warehouse.nature)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getTypeLabel(warehouse.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {warehouse.includeInCalculation ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            是
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            否
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>
                              {Math.round((warehouse.usedCapacity / warehouse.capacity) * 100)}%
                            </span>
                            <span className="text-muted-foreground">
                              {warehouse.usedCapacity}/{warehouse.capacity}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                warehouse.usedCapacity / warehouse.capacity > 0.9
                                  ? 'bg-red-500'
                                  : warehouse.usedCapacity / warehouse.capacity > 0.7
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${(warehouse.usedCapacity / warehouse.capacity) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{warehouse.manager}</TableCell>
                      <TableCell>
                        {warehouse.status === 'active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            {tc('active')}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            {tc('inactive')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(warehouse)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(warehouse)}
                              className="text-red-600"
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
          </CardContent>
        </Card>

        {/* 新增/编辑对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? '编辑仓库' : '新增仓库'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  仓库编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder={t('warehouseCodePlaceholderExample')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">
                  仓库名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={tc("enterWarehouseName")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nature">{t('nature')}</Label>
                <Select
                  value={formData.nature}
                  onValueChange={(value) =>
                    setFormData({ ...formData, nature: value as Warehouse['nature'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectNature')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseNatures.map((nature) => (
                      <SelectItem key={nature.value} value={nature.value}>
                        {t(nature.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('typeLabel')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Warehouse['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">{tc("responsiblePerson")}</Label>
                <Input
                  id="manager"
                  placeholder={t('managerPlaceholder')}
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">{tc("phone")}</Label>
                <Input
                  id="contact"
                  placeholder={t('contactPlaceholder')}
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">{t('capacityLabel')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder={tc("enterWarehouseCapacity")}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('addressLabel')}</Label>
                <Input
                  id="address"
                  placeholder={t('addressPlaceholder')}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeInCalculation">{t('includeInCalculation')}</Label>
                  <Switch
                    id="includeInCalculation"
                    checked={formData.includeInCalculation}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeInCalculation: checked })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  开启后，该仓库的库存将参与MRP需求计算
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="remark">{tc("remark")}</Label>
                <Input
                  id="remark"
                  placeholder={t('remarkPlaceholder')}
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} className="btn-dashboard-primary">
                {editingWarehouse ? tc('save') : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                确定要删除仓库 <strong>{warehouseToDelete?.name}</strong> 吗？
              </p>
              <p className="text-sm text-red-500 mt-2">{t('irreversibleWarning')}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
