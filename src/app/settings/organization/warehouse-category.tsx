'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Warehouse, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';

// 仓库分类接口
interface WarehouseCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  sort_order: number;
  status: number;
  warehouse_count?: number;
  active_warehouse_count?: number;
  total_capacity?: number;
  total_used_capacity?: number;
  create_time?: string;
  update_time?: string;
}

// 统计数据接口
interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  totalWarehouses: number;
  activeWarehouses: number;
}

export function WarehouseCategoryManager() {
  const [categories, setCategories] = useState<WarehouseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<WarehouseCategory>>({});
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<CategoryStats>({ total: 0, active: 0, inactive: 0, totalWarehouses: 0, activeWarehouses: 0 });
  const [codeError, setCodeError] = useState('');

  // 生成唯一仓库分类编码
  const generateCategoryCode = () => {
    // 从现有分类中提取最大的序号
    let maxNum = 0;
    categories.forEach(c => {
      if (c.code) {
        const match = c.code.match(/WH-CAT-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    
    // 生成新的编码，确保不重复
    let counter = maxNum + 1;
    let newCode = `WH-CAT-${String(counter).padStart(3, '0')}`;
    
    // 再次检查是否已存在（防止数据库中有但前端未加载的数据）
    const existingCodes = categories.map(c => c.code);
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = `WH-CAT-${String(counter).padStart(3, '0')}`;
    }
    
    return newCode;
  };

  // 检查仓库分类编码是否重复
  const checkCodeDuplicate = (code: string, excludeId?: number) => {
    return categories.some(c => c.code === code && c.id !== excludeId);
  };

  // 获取仓库分类列表（带统计）
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/organization/warehouse-category/stats');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data.categories);
        setStats({
          total: result.data.summary.total_categories,
          active: result.data.summary.active_categories,
          inactive: result.data.summary.total_categories - result.data.summary.active_categories,
          totalWarehouses: result.data.summary.total_warehouses,
          activeWarehouses: result.data.summary.active_warehouses
        });
      }
    } catch (error) {
      console.error('获取仓库分类失败:', error);
      toast.error('获取仓库分类失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存仓库分类
  const saveCategory = async () => {
    console.log('saveCategory函数被调用', form);
    
    // 表单验证
    if (!form.code || !form.code.trim()) {
      toast.error('请输入分类编码');
      return;
    }
    if (!form.name || !form.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    
    // 检查编码重复
    if (checkCodeDuplicate(form.code, form.id)) {
      setCodeError('该分类编码已存在');
      toast.error('该分类编码已存在');
      return;
    }
    
    try {
      const method = editing ? 'PUT' : 'POST';
      const requestBody = {
        id: form.id,
        code: form.code,
        name: form.name,
        description: form.description,
        sort_order: form.sort_order || 0,
        status: form.status ?? 1
      };
      
      console.log('发送请求:', method, requestBody);
      
      const response = await fetch('/api/organization/warehouse-category', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('响应状态:', response.status);
      const result = await response.json();
      console.log('响应结果:', result);
      
      if (result.success) {
        toast.success(editing ? '分类更新成功' : '分类创建成功');
        setDialogOpen(false);
        setCodeError('');
        fetchCategories();
      } else if (result.message === '分类编码已存在' && !editing) {
        // 如果是新增且编码已存在，自动尝试下一个编码
        toast.error('编码已存在，请使用自动生成按钮生成新编码');
        setCodeError('该编码已存在，请重新生成');
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      toast.error('保存分类失败');
    }
  };

  // 删除仓库分类
  const deleteCategory = async (id: number) => {
    if (!confirm('确定要删除该仓库分类吗？')) return;
    try {
      const response = await fetch(`/api/organization/warehouse-category?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        toast.success('分类删除成功');
        fetchCategories();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除分类失败');
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状态标签
  const getStatusBadge = (status: number) => {
    return status === 1 
      ? <Badge className="bg-green-100 text-green-800">启用</Badge>
      : <Badge className="bg-gray-100 text-gray-800">停用</Badge>;
  };

  // 使用率计算
  const getUsageRate = (used: number, total: number) => {
    if (!total) return 0;
    return Math.round((used / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总分类数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Warehouse className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">启用分类</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">仓库总数</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalWarehouses}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Warehouse className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">可用仓库</p>
                <p className="text-2xl font-bold text-orange-600">{stats.activeWarehouses}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              仓库分类管理
            </CardTitle>
            <CardDescription>管理仓库分类，用于资源配置和容量规划</CardDescription>
          </div>
          <Button 
            onClick={async () => {
              // 如果数据未加载，先加载数据
              if (categories.length === 0 && !loading) {
                await fetchCategories();
              }
              // 重新生成编码（使用最新数据）
              const newCode = generateCategoryCode();
              setForm({ code: newCode, name: '', status: 1, sort_order: categories.length + 1 });
              setEditing(false);
              setCodeError('');
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增分类
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类编码</TableHead>
                  <TableHead>分类名称</TableHead>
                  <TableHead>仓库数量</TableHead>
                  <TableHead>总容量/已使用</TableHead>
                  <TableHead>使用率</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      暂无仓库分类数据
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{category.code}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-gray-900">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{category.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={(category.warehouse_count || 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}>
                            {category.warehouse_count || 0} 个仓库
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {(category.total_capacity || 0) > 0 ? `${(category.total_capacity || 0).toLocaleString()} / ${(category.total_used_capacity || 0).toLocaleString()}` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(category.total_capacity || 0) > 0 ? (
                              <>
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${getUsageRate(category.total_used_capacity || 0, category.total_capacity || 0)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {getUsageRate(category.total_used_capacity || 0, category.total_capacity || 0)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{category.sort_order}</TableCell>
                        <TableCell>{getStatusBadge(category.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm(category);
                                setEditing(true);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(category.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑仓库分类' : '新增仓库分类'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改仓库分类信息' : '填写仓库分类基本信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类编码 <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input 
                    value={form.code || ''} 
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({...form, code: value});
                      
                      // 实时检测重复
                      if (value && checkCodeDuplicate(value, form.id)) {
                        setCodeError('该分类编码已存在');
                      } else {
                        setCodeError('');
                      }
                    }}
                    placeholder="如: WH-CAT-001"
                    className={codeError ? 'border-red-500' : ''}
                  />
                  {!editing && (
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        const newCode = generateCategoryCode();
                        setForm({...form, code: newCode});
                        setCodeError('');
                      }}
                    >
                      自动生成
                    </Button>
                  )}
                </div>
                {codeError && (
                  <p className="text-sm text-red-500">{codeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>分类名称 <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.name || ''} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="请输入分类名称"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input 
                type="number"
                value={form.sort_order || 0} 
                onChange={(e) => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                placeholder="数字越小越靠前"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <select 
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent"
                value={form.status ?? 1}
                onChange={(e) => setForm({...form, status: parseInt(e.target.value)})}
              >
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>分类描述</Label>
              <textarea 
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent"
                value={form.description || ''} 
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="请输入分类描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} type="button">取消</Button>
            <Button 
              onClick={saveCategory} 
              className="bg-blue-600 hover:bg-blue-700"
              type="button"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
