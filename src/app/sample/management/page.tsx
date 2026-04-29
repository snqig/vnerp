'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';

const sampleData = [
  {
    id: 'S20240115001',
    name: '包装膜样品A',
    customer: '深圳伟业科技',
    status: 'pending',
    requestDate: '2024-01-15',
    deliveryDate: '2024-01-20',
  },
  {
    id: 'S20240114002',
    name: '标签贴纸样品B',
    customer: '广州华达包装',
    status: 'approved',
    requestDate: '2024-01-14',
    deliveryDate: '2024-01-18',
  },
  {
    id: 'S20240113003',
    name: '彩印膜样品C',
    customer: '东莞恒通新材',
    status: 'completed',
    requestDate: '2024-01-13',
    deliveryDate: '2024-01-16',
  },
];

const statusLabelMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  completed: '已完成',
};

export default function SampleManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待审批', className: 'bg-yellow-100 text-yellow-700' },
      approved: { label: '已通过', className: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
      completed: { label: '已完成', className: 'bg-blue-100 text-blue-700' },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const exportColumns = [
    { key: '样品编号', header: '样品编号' },
    { key: '样品名称', header: '样品名称' },
    { key: '客户', header: '客户' },
    { key: '申请日期', header: '申请日期' },
    { key: '交付日期', header: '交付日期' },
    { key: '状态', header: '状态' },
  ];
  const getExportData = () => sampleData.map(s => ({
    样品编号: s.id, 样品名称: s.name, 客户: s.customer,
    申请日期: s.requestDate, 交付日期: s.deliveryDate,
    状态: statusLabelMap[s.status] || s.status,
  }));

  return (
    <MainLayout title="样品管理">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索样品编号、名称、客户..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待审批</SelectItem>
                    <SelectItem value="approved">已通过</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={sampleData.length}
                  onSelectAll={() => setSelectedIds(new Set(sampleData.map(s => s.id)))}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={() => printTable(getExportData(), exportColumns, '样品列表')}
                  onExportPDF={() => exportTableToPDF(getExportData(), '样品列表', exportColumns, '样品列表')}
                  onExportXLS={() => exportTableToXLS(getExportData(), '样品列表', exportColumns)}
                  onExportWORD={() => exportTableToWORD(getExportData(), '样品列表', exportColumns, '样品列表')}
                />
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新增样品
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>样品列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === sampleData.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(new Set(sampleData.map(s => s.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium">样品编号</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">样品名称</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">客户</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">申请日期</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">交付日期</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">状态</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((sample) => (
                    <tr key={sample.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedIds.has(sample.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds);
                            if (checked) next.add(sample.id); else next.delete(sample.id);
                            setSelectedIds(next);
                          }}
                        />
                      </td>
                      <td className="p-4 font-mono">{sample.id}</td>
                      <td className="p-4 font-medium">{sample.name}</td>
                      <td className="p-4">{sample.customer}</td>
                      <td className="p-4 text-muted-foreground">{sample.requestDate}</td>
                      <td className="p-4 text-muted-foreground">{sample.deliveryDate}</td>
                      <td className="p-4">{getStatusBadge(sample.status)}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
