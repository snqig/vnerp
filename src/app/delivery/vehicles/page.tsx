'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Car,
  Wrench,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: number;
  vehicle_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  mileage: number;
  fuel_type: string;
  capacity: number;
  status: number;
  driver_name: string;
  driver_phone: string;
  insurance_expire: string;
  annual_inspect_expire: string;
  create_time: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  0: { label: '停用', variant: 'secondary' },
  1: { label: '可用', variant: 'default' },
  2: { label: '维修中', variant: 'outline' },
  3: { label: '报废', variant: 'destructive' },
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchVehicles();
  }, [page, status, keyword]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status !== 'all') params.append('status', status);
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/delivery/vehicles?${params}`);
      const result = await response.json();

      if (result.success) {
        setVehicles(result.data);
        setTotal(result.pagination.total);
      } else {
        toast.error(result.message || '获取车辆列表失败');
      }
    } catch (error) {
      toast.error('获取车辆列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这辆车吗？')) return;

    try {
      const response = await fetch(`/api/delivery/vehicles?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('删除成功');
        fetchVehicles();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchVehicles();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Car className="h-6 w-6" />
              车辆管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理公司车辆信息、维修记录和费用
            </p>
          </div>
          <Button onClick={() => router.push('/delivery/vehicles/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新增车辆
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索车牌号、品牌、司机..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="1">可用</option>
            <option value="2">维修中</option>
            <option value="0">停用</option>
            <option value="3">报废</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>

        {/* 车辆列表 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>车牌号</TableHead>
                <TableHead>车辆信息</TableHead>
                <TableHead>司机</TableHead>
                <TableHead>里程</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>保险到期</TableHead>
                <TableHead>年检到期</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无车辆数据
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.vehicle_no}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vehicle.brand} {vehicle.model}</div>
                        <div className="text-muted-foreground">
                          {vehicle.vehicle_type} · {vehicle.color} · {vehicle.fuel_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vehicle.driver_name || '-'}</div>
                        {vehicle.driver_phone && (
                          <div className="text-muted-foreground text-xs">
                            {vehicle.driver_phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.mileage?.toLocaleString()} km</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[vehicle.status]?.variant || 'default'}>
                        {statusMap[vehicle.status]?.label || '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>{vehicle.insurance_expire || '-'}</TableCell>
                    <TableCell>{vehicle.annual_inspect_expire || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/delivery/vehicles/${vehicle.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/delivery/vehicles/${vehicle.id}/repair`)}>
                            <Wrench className="h-4 w-4 mr-2" />
                            维修记录
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/delivery/vehicles/${vehicle.id}/cost`)}>
                            <FileText className="h-4 w-4 mr-2" />
                            费用记录
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(vehicle.id)}
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
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
