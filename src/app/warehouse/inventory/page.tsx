'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Barcode,
  BoxIcon,
  Layers,
} from 'lucide-react';

// 仓库统计
const warehouseStats = [
  { name: '原料仓库', code: 'WH-RAW', utilization: 78, items: 156, value: 1250000 },
  { name: '成品仓库', code: 'WH-FIN', utilization: 65, items: 89, value: 2350000 },
  { name: '板房仓库', code: 'WH-PLT', utilization: 42, items: 234, value: 456000 },
  { name: '油墨仓库', code: 'WH-INK', utilization: 55, items: 67, value: 320000 },
];

// 库存预警
const alerts = [
  { material: 'PET膜-透明', current: 1200, safety: 2000, unit: '㎡', type: 'low' },
  { material: '蓝色油墨', current: 15, safety: 20, unit: 'kg', type: 'low' },
  { material: '防静电剂', current: 8, safety: 10, unit: 'kg', type: 'low' },
  { material: 'PET膜-蓝色', current: 0, safety: 500, unit: '㎡', type: 'out' },
];

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    available: { label: '可用', className: 'bg-green-100 text-green-700' },
    frozen: { label: '冻结', className: 'bg-orange-100 text-orange-700' },
    inspecting: { label: '待检', className: 'bg-blue-100 text-blue-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

const getAlertBadge = (alertLevel: string) => {
  const alertMap: Record<string, { label: string; className: string }> = {
    normal: { label: '正常', className: 'bg-green-100 text-green-700' },
    warning: { label: '预警', className: 'bg-yellow-100 text-yellow-700' },
    critical: { label: '紧急', className: 'bg-red-100 text-red-700' },
  };
  const config = alertMap[alertLevel] || { label: alertLevel, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const result = await response.json();
      if (result.success) {
        setInventoryItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="库存查询">
      <div className="space-y-6">
        {/* 仓库概览 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {warehouseStats.map((wh) => (
            <Card key={wh.code}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BoxIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{wh.name}</span>
                  </div>
                  <Badge variant="outline">{wh.code}</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">库容利用率</span>
                      <span className="font-medium">{wh.utilization}%</span>
                    </div>
                    <Progress value={wh.utilization} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">物料种类</span>
                    <span className="font-medium">{wh.items}种</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">库存金额</span>
                    <span className="font-medium">¥{wh.value.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 库存预警 */}
        {alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                库存预警
              </CardTitle>
              <CardDescription className="text-orange-600">
                以下物料库存低于安全库存，请及时补货
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {alerts.map((alert, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      {alert.type === 'out' ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium text-sm">{alert.material}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      当前: <span className={alert.type === 'out' ? 'text-red-500 font-medium' : 'text-orange-500 font-medium'}>{alert.current}</span> {alert.unit}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      安全库存: {alert.safety} {alert.unit}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 库存列表 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>库存明细</CardTitle>
                <CardDescription>批次库存查询，支持先进先出追溯</CardDescription>
              </div>
              <div className="flex flex-1 gap-4 items-center max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="扫描/输入批次号、物料名称..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部仓库</SelectItem>
                    <SelectItem value="raw">原料仓库</SelectItem>
                    <SelectItem value="finished">成品仓库</SelectItem>
                    <SelectItem value="plate">板房仓库</SelectItem>
                    <SelectItem value="ink">油墨仓库</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="available">可用</SelectItem>
                    <SelectItem value="frozen">冻结</SelectItem>
                    <SelectItem value="inspecting">待检</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">加载中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>批次号</TableHead>
                    <TableHead>物料</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>仓库/库位</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">可用</TableHead>
                    <TableHead className="text-right">预占</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>预警</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item: any) => (
                    <TableRow key={item.batchNo}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          <Barcode className="h-4 w-4 text-muted-foreground" />
                          {item.batchNo}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.materialName || item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.materialSpec}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{item.warehouseName}</span>
                          <span className="font-mono text-sm">{item.locationName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.quantity).toLocaleString()} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{parseFloat(item.availableQty).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600">{parseFloat(item.reservedQty).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{getAlertBadge(item.alertLevel)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Layers className="h-4 w-4 mr-1" />
                          追溯
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
