'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Search, 
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToastContext } from '@/components/ui/toast';
import { MainLayout } from '@/components/layout/main-layout';

interface BOMLine {
  id?: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  unit: string;
  consumption_qty: number;
  loss_rate: number;
  unit_cost: number;
  material_type: string;
  is_key_material: boolean;
  position_no: string;
  process_seq: number | null;
  process_name: string;
  remark: string;
}

const materialTypes = [
  { value: 'RAW', label: '原材料' },
  { value: 'SEMI', label: '半成品' },
  { value: 'PACK', label: '包装材料' },
  { value: 'TOOL', label: '工具' },
  { value: 'OTHER', label: '其他' },
];

const units = [
  { value: '件', label: '件' },
  { value: '个', label: '个' },
  { value: '套', label: '套' },
  { value: '米', label: '米' },
  { value: '千克', label: '千克' },
  { value: '克', label: '克' },
  { value: '毫升', label: '毫升' },
  { value: '升', label: '升' },
];

export default function CreateBOMPage() {
  const router = useRouter();
  const { addToast: toast } = useToastContext();
  
  const [formData, setFormData] = useState({
    product_id: 0,
    product_code: '',
    product_name: '',
    product_spec: '',
    version: 'V1.0',
    base_qty: 1,
    unit: '件',
    remark: '',
  });
  
  const [lines, setLines] = useState<BOMLine[]>([]);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const addNewLine = () => {
    const newLine: BOMLine = {
      material_id: 0,
      material_code: '',
      material_name: '',
      material_spec: '',
      unit: '件',
      consumption_qty: 1,
      loss_rate: 0,
      unit_cost: 0,
      material_type: 'RAW',
      is_key_material: false,
      position_no: '',
      process_seq: null,
      process_name: '',
      remark: '',
    };
    setLines(prev => [...prev, newLine]);
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof BOMLine, value: any) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = {
        ...newLines[index],
        [field]: value
      };
      return newLines;
    });
  };

  const openMaterialDialog = (lineIndex: number) => {
    setCurrentLineIndex(lineIndex);
    setSearchKeyword('');
    setMaterials([]);
    setMaterialDialogOpen(true);
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchKeyword) params.append('keyword', searchKeyword);
      
      const res = await fetch(`/api/orders/bom/materials?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMaterials(data.data || []);
      } else {
        toast({
          title: '错误',
          description: data.message || '获取物料列表失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '错误',
        description: '获取物料列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectMaterial = (material: any) => {
    if (currentLineIndex < 0) return;
    updateLine(currentLineIndex, 'material_id', material.id);
    updateLine(currentLineIndex, 'material_code', material.material_code);
    updateLine(currentLineIndex, 'material_name', material.material_name);
    updateLine(currentLineIndex, 'material_spec', material.material_spec);
    updateLine(currentLineIndex, 'unit', material.unit);
    updateLine(currentLineIndex, 'unit_cost', parseFloat(String(material.unit_cost || 0)));
    updateLine(currentLineIndex, 'material_type', material.material_type);
    setMaterialDialogOpen(false);
    setCurrentLineIndex(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_code || !formData.product_name) {
      toast({
        title: '错误',
        description: '产品编码和产品名称不能为空',
        variant: 'destructive',
      });
      return;
    }
    
    if (lines.length === 0) {
      toast({
        title: '错误',
        description: 'BOM明细不能为空',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptyMaterial = lines.some(l => !l.material_code || !l.material_name);
    if (hasEmptyMaterial) {
      toast({
        title: '错误',
        description: '物料编码和名称不能为空，请选择物料',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/orders/bom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          lines,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '成功',
          description: 'BOM创建成功',
        });
        router.push('/orders/bom');
      } else {
        toast({
          title: '错误',
          description: data.message || 'BOM创建失败',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '错误',
        description: 'BOM创建失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="创建BOM">
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">创建BOM</h1>
        <Button onClick={() => router.back()} variant="secondary">
          <X className="h-4 w-4 mr-2" />
          返回
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>填写BOM的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="product_code">产品编码</Label>
                <Input
                  id="product_code"
                  name="product_code"
                  value={formData.product_code}
                  onChange={handleInputChange}
                  placeholder="请输入产品编码"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name">产品名称</Label>
                <Input
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  placeholder="请输入产品名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_spec">产品规格</Label>
                <Input
                  id="product_spec"
                  name="product_spec"
                  value={formData.product_spec}
                  onChange={handleInputChange}
                  placeholder="请输入产品规格"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">版本号</Label>
                <Input
                  id="version"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  placeholder="请输入版本号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_qty">基础数量</Label>
                <Input
                  id="base_qty"
                  name="base_qty"
                  type="number"
                  min="1"
                  step="0.001"
                  value={formData.base_qty}
                  onChange={(e) => handleNumberChange('base_qty', e.target.value)}
                  placeholder="请输入基础数量"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">单位</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="请选择单位" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                name="remark"
                value={formData.remark}
                onChange={handleInputChange}
                placeholder="请输入备注信息"
                rows={3}
              />
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">BOM明细</h2>
                <Button onClick={addNewLine} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  添加物料
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">序号</TableHead>
                    <TableHead>物料编码</TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>用量</TableHead>
                    <TableHead>损耗率(%)</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>物料类型</TableHead>
                    <TableHead>关键物料</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={line.material_code}
                            onChange={(e) => updateLine(index, 'material_code', e.target.value)}
                            placeholder="编码"
                            className="w-32"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            type="button"
                            onClick={() => openMaterialDialog(index)}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.material_name}
                          onChange={(e) => updateLine(index, 'material_name', e.target.value)}
                          placeholder="名称"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.material_spec}
                          onChange={(e) => updateLine(index, 'material_spec', e.target.value)}
                          placeholder="规格"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.unit}
                          onValueChange={(value) => updateLine(index, 'unit', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="单位" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.consumption_qty}
                          onChange={(e) => updateLine(index, 'consumption_qty', parseFloat(e.target.value) || 0)}
                          placeholder="用量"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={line.loss_rate}
                          onChange={(e) => updateLine(index, 'loss_rate', parseFloat(e.target.value) || 0)}
                          placeholder="损耗率"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(e) => updateLine(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          placeholder="单价"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.material_type}
                          onValueChange={(value) => updateLine(index, 'material_type', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={line.is_key_material}
                          onChange={(e) => updateLine(index, 'is_key_material', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {lines.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无BOM明细，请添加物料</p>
                </div>
              )}
            </div>

            <CardFooter className="flex justify-end space-x-4">
              <Button variant="secondary" onClick={() => router.back()} type="button">
                取消
              </Button>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>

    <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
      <DialogContent className="sm:max-w-2xl" resizable>
        <DialogHeader>
          <DialogTitle>选择物料 (第 {currentLineIndex + 1} 行)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMaterials()}
              placeholder="搜索物料编码或名称"
            />
            <Button onClick={fetchMaterials} loading={loading} type="button">
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料编码</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>单价</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    请输入关键词搜索物料
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.material_code}</TableCell>
                    <TableCell>{material.material_name}</TableCell>
                    <TableCell>{material.material_spec}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>{material.unit_cost}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => selectMaterial(material)}
                      >
                        选择
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
    </MainLayout>
  );
}
