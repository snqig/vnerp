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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Scan,
  QrCode,
  Layers,
  Package,
  Factory,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';

// 追溯数据结构
const traceData = {
  product: {
    batchNo: 'FIN20240115001',
    product: '包装膜-透明',
    specification: '厚度0.08mm,宽度1200mm',
    quantity: 5000,
    unit: '㎡',
    status: '合格',
    customer: '深圳伟业科技有限公司',
  },
  production: {
    workOrder: 'WO20240115001',
    startDate: '2024-01-15 08:00',
    endDate: '2024-01-15 17:30',
    equipment: '印刷机-A01',
    operators: ['张三', '李四'],
    processes: [
      { name: '切料', startTime: '08:00', endTime: '09:30', operator: '张三', status: 'completed' },
      { name: '印刷', startTime: '09:45', endTime: '14:00', operator: '李四', status: 'completed' },
      { name: '烘干', startTime: '14:15', endTime: '16:00', operator: '李四', status: 'completed' },
      { name: '检验', startTime: '16:15', endTime: '17:00', operator: '王五', status: 'completed' },
    ],
  },
  materials: [
    { name: 'PET膜-透明', batchNo: 'RAW20240110001', supplier: '上海材料供应商', qty: 5250, unit: '㎡' },
    { name: '胶水-A型', batchNo: 'RAW20240108002', supplier: '广州化工', qty: 105, unit: 'kg' },
    { name: '透明油墨', batchNo: 'INK20240105001', supplier: '深圳油墨厂', qty: 50, unit: 'kg' },
  ],
  quality: [
    { type: '首件确认', result: '合格', inspector: '王五', time: '2024-01-15 10:30' },
    { type: '巡检1', result: '合格', inspector: '王五', time: '2024-01-15 12:00' },
    { type: '巡检2', result: '合格', inspector: '王五', time: '2024-01-15 14:30' },
    { type: '成品检验', result: '合格', inspector: '王五', time: '2024-01-15 16:30' },
  ],
};

export default function TracePage() {
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [showResult, setShowResult] = useState(true);

  const handleSearch = () => {
    if (scannedCode) {
      setShowResult(true);
      setIsScanOpen(false);
    }
  };

  return (
    <MainLayout title="追溯查询">
      <div className="space-y-6">
        {/* 搜索区域 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="扫描/输入追溯码、批次号..." 
                    className="pl-10"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch}>
                  <Layers className="h-4 w-4 mr-2" />
                  追溯
                </Button>
              </div>
              <Button variant="outline" onClick={() => setIsScanOpen(true)}>
                <Scan className="h-4 w-4 mr-2" />
                扫码追溯
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 追溯结果 */}
        {showResult && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="production">生产信息</TabsTrigger>
              <TabsTrigger value="materials">原料信息</TabsTrigger>
              <TabsTrigger value="quality">品质记录</TabsTrigger>
            </TabsList>

            {/* 概览 */}
            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      产品信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">批次号：</span>{traceData.product.batchNo}</div>
                      <div><span className="text-muted-foreground">产品：</span>{traceData.product.product}</div>
                      <div><span className="text-muted-foreground">规格：</span>{traceData.product.specification}</div>
                      <div><span className="text-muted-foreground">数量：</span>{traceData.product.quantity} {traceData.product.unit}</div>
                      <div><span className="text-muted-foreground">客户：</span>{traceData.product.customer}</div>
                      <div><span className="text-muted-foreground">状态：</span>
                        <Badge className="bg-green-100 text-green-700 ml-1">{traceData.product.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      生产概况
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">工单：</span>{traceData.production.workOrder}</div>
                      <div><span className="text-muted-foreground">设备：</span>{traceData.production.equipment}</div>
                      <div><span className="text-muted-foreground">开始：</span>{traceData.production.startDate}</div>
                      <div><span className="text-muted-foreground">结束：</span>{traceData.production.endDate}</div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">操作员：</span>
                        {traceData.production.operators.join(', ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 流程图 */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>生产流程</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between overflow-x-auto pb-4">
                    {traceData.production.processes.map((process, index) => (
                      <div key={process.name} className="flex items-center">
                        <div className={`flex flex-col items-center p-4 rounded-lg min-w-[100px] ${
                          process.status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className={`p-2 rounded-full mb-2 ${
                            process.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {process.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </div>
                          <span className="font-medium text-sm">{process.name}</span>
                          <span className="text-xs text-muted-foreground">{process.startTime} - {process.endTime}</span>
                          <span className="text-xs text-muted-foreground">{process.operator}</span>
                        </div>
                        {index < traceData.production.processes.length - 1 && (
                          <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 生产信息 */}
            <TabsContent value="production">
              <Card>
                <CardHeader>
                  <CardTitle>工序明细</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>工序</TableHead>
                        <TableHead>开始时间</TableHead>
                        <TableHead>结束时间</TableHead>
                        <TableHead>操作员</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.production.processes.map((process) => (
                        <TableRow key={process.name}>
                          <TableCell className="font-medium">{process.name}</TableCell>
                          <TableCell>{process.startTime}</TableCell>
                          <TableCell>{process.endTime}</TableCell>
                          <TableCell>{process.operator}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700">完成</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 原料信息 */}
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle>原料批次追溯</CardTitle>
                  <CardDescription>本批次产品使用的原料批次信息</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>原料名称</TableHead>
                        <TableHead>批次号</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead className="text-right">用量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.materials.map((material) => (
                        <TableRow key={material.batchNo}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell className="font-mono">{material.batchNo}</TableCell>
                          <TableCell>{material.supplier}</TableCell>
                          <TableCell className="text-right">{material.qty} {material.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 品质记录 */}
            <TabsContent value="quality">
              <Card>
                <CardHeader>
                  <CardTitle>品质检验记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>检验类型</TableHead>
                        <TableHead>检验结果</TableHead>
                        <TableHead>检验员</TableHead>
                        <TableHead>时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traceData.quality.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.type}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700">{item.result}</Badge>
                          </TableCell>
                          <TableCell>{item.inspector}</TableCell>
                          <TableCell>{item.time}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* 扫码弹窗 */}
        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>扫码追溯</DialogTitle>
              <DialogDescription>
                扫描成品或批次二维码，3秒内展现完整生产信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">使用PDA扫描二维码</p>
              </div>
              <div className="space-y-2">
                <Input 
                  placeholder="或手动输入追溯码..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSearch}>追溯查询</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
