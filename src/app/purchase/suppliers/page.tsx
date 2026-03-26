'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLACKLISTED';
  contactPerson: string;
  contactPhone: string;
  score: number;
  otd: number;
  defectRate: number;
}

const suppliers: Supplier[] = [
  {
    id: '1',
    code: 'S-20240501-001',
    name: '金鹰薄膜有限公司',
    shortName: '金鹰',
    type: '原料',
    grade: 'S',
    status: 'ACTIVE',
    contactPerson: '李四',
    contactPhone: '13800138000',
    score: 95.5,
    otd: 98.5,
    defectRate: 0.3,
  },
  {
    id: '2',
    code: 'S-20240501-002',
    name: '华达油墨科技有限公司',
    shortName: '华达',
    type: '油墨',
    grade: 'A',
    status: 'ACTIVE',
    contactPerson: '王五',
    contactPhone: '13900139000',
    score: 87.2,
    otd: 95.0,
    defectRate: 0.8,
  },
  {
    id: '3',
    code: 'S-20240501-003',
    name: '恒通包装材料厂',
    shortName: '恒通',
    type: '包装',
    grade: 'B',
    status: 'ACTIVE',
    contactPerson: '张三',
    contactPhone: '13700137000',
    score: 75.8,
    otd: 88.5,
    defectRate: 1.5,
  },
  {
    id: '4',
    code: 'S-20240501-004',
    name: '伟业辅料供应商',
    shortName: '伟业',
    type: '辅料',
    grade: 'C',
    status: 'SUSPENDED',
    contactPerson: '赵六',
    contactPhone: '13600136000',
    score: 65.2,
    otd: 78.0,
    defectRate: 2.8,
  },
  {
    id: '5',
    code: 'S-20240501-005',
    name: '问题原料有限公司',
    shortName: '问题原料',
    type: '原料',
    grade: 'D',
    status: 'BLACKLISTED',
    contactPerson: '钱七',
    contactPhone: '13500135000',
    score: 45.0,
    otd: 60.0,
    defectRate: 5.5,
  },
];

const gradeColors: Record<string, string> = {
  S: 'bg-yellow-500 text-white',
  A: 'bg-gray-400 text-white',
  B: 'bg-orange-400 text-white',
  C: 'bg-orange-500 text-white',
  D: 'bg-red-500 text-white',
};

const gradeNames: Record<string, string> = {
  S: '战略',
  A: '优选',
  B: '合格',
  C: '条件',
  D: '失格',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  BLACKLISTED: 'bg-red-100 text-red-800',
};

const statusNames: Record<string, string> = {
  ACTIVE: '启用',
  SUSPENDED: '暂停',
  BLACKLISTED: '黑名单',
};

export default function SuppliersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleView = (id: string) => {
    router.push(`/purchase/suppliers/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/purchase/suppliers/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个供应商吗？')) {
      toast.success('供应商删除成功（演示）');
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || supplier.grade === gradeFilter;
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <MainLayout title="供应商管理">
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">1</div>
              <div className="text-sm text-muted-foreground">战略供应商(S)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">1</div>
              <div className="text-sm text-muted-foreground">优选供应商(A)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-500">1</div>
              <div className="text-sm text-muted-foreground">合格供应商(B)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-muted-foreground">条件供应商(C)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">1</div>
              <div className="text-sm text-muted-foreground">失格供应商(D)</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索供应商编号、名称..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    <SelectItem value="S">战略(S)</SelectItem>
                    <SelectItem value="A">优选(A)</SelectItem>
                    <SelectItem value="B">合格(B)</SelectItem>
                    <SelectItem value="C">条件(C)</SelectItem>
                    <SelectItem value="D">失格(D)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="ACTIVE">启用</SelectItem>
                    <SelectItem value="SUSPENDED">暂停</SelectItem>
                    <SelectItem value="BLACKLISTED">黑名单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建供应商
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建供应商</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>供应商全称</Label>
                      <Input placeholder="请输入供应商全称" />
                    </div>
                    <div className="space-y-2">
                      <Label>供应商简称</Label>
                      <Input placeholder="请输入简称" />
                    </div>
                    <div className="space-y-2">
                      <Label>供应商类型</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="原料">原料</SelectItem>
                          <SelectItem value="油墨">油墨</SelectItem>
                          <SelectItem value="辅料">辅料</SelectItem>
                          <SelectItem value="包装">包装</SelectItem>
                          <SelectItem value="设备">设备</SelectItem>
                          <SelectItem value="委外">委外</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>联系人</Label>
                      <Input placeholder="请输入联系人" />
                    </div>
                    <div className="space-y-2">
                      <Label>联系电话</Label>
                      <Input placeholder="请输入联系电话" />
                    </div>
                    <div className="space-y-2">
                      <Label>邮箱</Label>
                      <Input placeholder="请输入邮箱" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">取消</Button>
                    <Button>保存</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 供应商列表 */}
        <Card>
          <CardHeader>
            <CardTitle>供应商列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>供应商编号</TableHead>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最近评分</TableHead>
                  <TableHead>交付OTD</TableHead>
                  <TableHead>质量不良率</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono">{supplier.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.shortName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={gradeColors[supplier.grade]}>
                        <Star className="h-3 w-3 mr-1" />
                        {supplier.grade} - {gradeNames[supplier.grade]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[supplier.status]}>
                        {supplier.status === 'BLACKLISTED' && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {statusNames[supplier.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{supplier.score.toFixed(1)}</span>
                    </TableCell>
                    <TableCell>{supplier.otd.toFixed(1)}%</TableCell>
                    <TableCell>{supplier.defectRate.toFixed(1)}%</TableCell>
                    <TableCell>
                      <div>
                        <div>{supplier.contactPerson}</div>
                        <div className="text-sm text-muted-foreground">{supplier.contactPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleView(supplier.id)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
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
