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
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  History,
} from 'lucide-react';
import { useState } from 'react';

// 模拟产品数据
const products = [
  {
    id: 1,
    code: 'P001',
    name: '包装膜-透明',
    specification: '厚度0.08mm,宽度1200mm',
    unit: '㎡',
    category: '包装膜',
    customer: '通用',
    bomVersion: 'V2.0',
    status: 'active',
  },
  {
    id: 2,
    code: 'P002',
    name: '标签贴纸',
    specification: '尺寸100x50mm,铜版纸',
    unit: '张',
    category: '标签',
    customer: '通用',
    bomVersion: 'V1.0',
    status: 'active',
  },
  {
    id: 3,
    code: 'P003',
    name: '彩印膜-蓝',
    specification: '厚度0.1mm,宽度1000mm,蓝色',
    unit: '㎡',
    category: '彩印膜',
    customer: '东莞恒通',
    bomVersion: 'V1.2',
    status: 'active',
  },
  {
    id: 4,
    code: 'P004',
    name: '防静电膜',
    specification: '厚度0.12mm,宽度800mm,防静电',
    unit: '㎡',
    category: '功能膜',
    customer: '佛山利达',
    bomVersion: 'V3.0',
    status: 'active',
  },
  {
    id: 5,
    code: 'P005',
    name: '热收缩膜',
    specification: '厚度0.05mm,宽度600mm',
    unit: '㎡',
    category: '收缩膜',
    customer: '中山新材',
    bomVersion: 'V1.1',
    status: 'active',
  },
];

// BOM明细模拟数据
const bomItems = [
  { material: 'PET膜', specification: '厚度0.08mm', quantity: 1.05, unit: '㎡', lossRate: '5%' },
  { material: '胶水-A型', specification: '水性', quantity: 0.02, unit: 'kg', lossRate: '2%' },
  { material: '印刷油墨', specification: '透明', quantity: 0.01, unit: 'kg', lossRate: '3%' },
];

export default function ProductsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  return (
    <MainLayout title="产品档案">
      <div className="space-y-6">
        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索产品编码、名称..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="产品分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="package">包装膜</SelectItem>
                    <SelectItem value="label">标签</SelectItem>
                    <SelectItem value="color">彩印膜</SelectItem>
                    <SelectItem value="functional">功能膜</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建产品
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建产品</DialogTitle>
                    <DialogDescription>填写产品基本信息和BOM配方</DialogDescription>
                  </DialogHeader>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="list">基本信息</TabsTrigger>
                      <TabsTrigger value="bom">BOM配方</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="code">产品编码</Label>
                          <Input id="code" placeholder="自动生成" disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">产品分类</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="package">包装膜</SelectItem>
                              <SelectItem value="label">标签</SelectItem>
                              <SelectItem value="color">彩印膜</SelectItem>
                              <SelectItem value="functional">功能膜</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">产品名称 *</Label>
                        <Input id="name" placeholder="产品名称" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="specification">规格型号</Label>
                          <Input id="specification" placeholder="规格描述" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unit">计量单位</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择单位" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="㎡">㎡</SelectItem>
                              <SelectItem value="张">张</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="卷">卷</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="bom" className="mt-4">
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>物料</TableHead>
                              <TableHead>规格</TableHead>
                              <TableHead className="w-[100px]">用量</TableHead>
                              <TableHead className="w-[80px]">单位</TableHead>
                              <TableHead className="w-[80px]">损耗率</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bomItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.material}</TableCell>
                                <TableCell>{item.specification}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>{item.lossRate}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        添加物料
                      </Button>
                    </TabsContent>
                  </Tabs>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={() => setIsCreateOpen(false)}>保存</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 产品列表 */}
        <Card>
          <CardHeader>
            <CardTitle>产品列表</CardTitle>
            <CardDescription>共 {products.length} 个产品</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>规格型号</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>BOM版本</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.specification}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.bomVersion}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">启用</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Package className="h-4 w-4 mr-2" />
                            查看BOM
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="h-4 w-4 mr-2" />
                            版本历史
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
