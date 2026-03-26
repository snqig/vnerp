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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Scan,
  QrCode,
  Factory,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

// 报工记录
const reports = [
  {
    id: 'RPT20240115001',
    workOrder: 'WO20240115001',
    process: '印刷',
    employee: '张三',
    equipment: '印刷机-A01',
    goodQty: 1500,
    scrapQty: 20,
    workMinutes: 480,
    efficiency: 95,
    status: 'normal',
    reportedAt: '2024-01-15 17:00:00',
  },
  {
    id: 'RPT20240115002',
    workOrder: 'WO20240115002',
    process: '模切',
    employee: '李四',
    equipment: '模切机-B02',
    goodQty: 2000,
    scrapQty: 50,
    workMinutes: 480,
    efficiency: 78,
    status: 'warning',
    reportedAt: '2024-01-15 17:30:00',
  },
  {
    id: 'RPT20240115003',
    workOrder: 'WO20240115004',
    process: '检验',
    employee: '王五',
    equipment: '-',
    goodQty: 5400,
    scrapQty: 0,
    workMinutes: 240,
    efficiency: 100,
    status: 'normal',
    reportedAt: '2024-01-15 14:00:00',
  },
];

// 员工列表
const employees = [
  { code: 'EMP001', name: '张三', department: '生产部' },
  { code: 'EMP002', name: '李四', department: '生产部' },
  { code: 'EMP003', name: '王五', department: '品质部' },
  { code: 'EMP004', name: '赵六', department: '生产部' },
];

// 机台列表
const equipments = [
  { code: 'EQ001', name: '印刷机-A01', type: '印刷' },
  { code: 'EQ002', name: '印刷机-A02', type: '印刷' },
  { code: 'EQ003', name: '模切机-B01', type: '模切' },
  { code: 'EQ004', name: '模切机-B02', type: '模切' },
  { code: 'EQ005', name: '分切机-C01', type: '分切' },
];

// 工单列表
const workOrders = [
  { code: 'WO20240115001', product: 'PET保护膜-001', quantity: 5000, process: '印刷' },
  { code: 'WO20240115002', product: '标签贴纸-002', quantity: 3000, process: '模切' },
  { code: 'WO20240115003', product: '胶带卷-003', quantity: 2000, process: '分切' },
  { code: 'WO20240115004', product: '检验任务-001', quantity: 10000, process: '检验' },
];

export default function ProductionReportPage() {
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanStep, setScanStep] = useState<'employee' | 'equipment' | 'workorder' | 'complete'>('employee');
  const [scannedCodes, setScannedCodes] = useState({
    employee: '',
    equipment: '',
    workorder: '',
  });
  const [inputCode, setInputCode] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);

  const handleScan = (type: 'employee' | 'equipment' | 'workorder' | 'complete', code: string) => {
    setScannedCodes(prev => ({ ...prev, [type]: code }));
    setInputCode('');
    
    if (type === 'employee') {
      setScanStep('equipment');
    } else if (type === 'equipment') {
      setScanStep('workorder');
    } else if (type === 'workorder') {
      setScanStep('complete');
      setIsWorking(true);
      setWorkStartTime(new Date());
      setIsScanOpen(false);
    }
  };

  const handleReset = () => {
    setScannedCodes({ employee: '', equipment: '', workorder: '' });
    setScanStep('employee');
    setIsWorking(false);
    setWorkStartTime(null);
  };

  const handleStartWork = () => {
    setScanStep('employee');
    setIsScanOpen(true);
  };

  const getEmployeeName = (code: string) => {
    const emp = employees.find(e => e.code === code);
    return emp ? `${emp.name} (${code})` : code;
  };

  const getEquipmentName = (code: string) => {
    const eq = equipments.find(e => e.code === code);
    return eq ? `${eq.name} (${code})` : code;
  };

  const getWorkOrderInfo = (code: string) => {
    const wo = workOrders.find(w => w.code === code);
    return wo ? `${wo.code} - ${wo.product}` : code;
  };

  return (
    <MainLayout title="生产报工">
      <div className="space-y-6">
        {/* 上工三扫码 - 主控制面板 */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Scan className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">上工三扫码</h3>
                  {isWorking && workStartTime && (
                    <Badge className="bg-green-100 text-green-700">
                      <Clock className="h-3 w-3 mr-1" />
                      工作中 - 开始时间: {workStartTime.toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  按照顺序扫描工牌、机台码、工单码完成上工登记，防止错单、错机
                </p>
                
                {/* 三扫码进度 */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    scannedCodes.employee ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`p-2 rounded-full ${scannedCodes.employee ? 'bg-green-500' : 'bg-blue-500'}`}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">1. 扫工牌</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scannedCodes.employee ? getEmployeeName(scannedCodes.employee) : '待扫描'}
                      </div>
                    </div>
                    {scannedCodes.employee && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                  </div>
                  
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    scannedCodes.equipment ? 'bg-green-50 border-green-300' : 
                    scannedCodes.employee ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`p-2 rounded-full ${scannedCodes.equipment ? 'bg-green-500' : scannedCodes.employee ? 'bg-blue-500' : 'bg-gray-400'}`}>
                      <Factory className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">2. 扫机台码</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scannedCodes.equipment ? getEquipmentName(scannedCodes.equipment) : '待扫描'}
                      </div>
                    </div>
                    {scannedCodes.equipment && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                  </div>
                  
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    scannedCodes.workorder ? 'bg-green-50 border-green-300' : 
                    scannedCodes.equipment ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`p-2 rounded-full ${scannedCodes.workorder ? 'bg-green-500' : scannedCodes.equipment ? 'bg-blue-500' : 'bg-gray-400'}`}>
                      <QrCode className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">3. 扫工单码</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scannedCodes.workorder ? getWorkOrderInfo(scannedCodes.workorder) : '待扫描'}
                      </div>
                    </div>
                    {scannedCodes.workorder && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  {!isWorking ? (
                    <Button onClick={handleStartWork} className="bg-blue-600 hover:bg-blue-700">
                      <Scan className="h-4 w-4 mr-2" />
                      开始上工扫码
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重新扫码
                      </Button>
                      <Button variant="destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        下工报工
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setScanStep('employee'); setIsScanOpen(true); }}>
            <CardContent className="p-6 text-center">
              <Scan className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <p className="font-medium">扫码报工</p>
              <p className="text-xs text-muted-foreground mt-1">PDA扫码快速报工</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Play className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <p className="font-medium">手工报工</p>
              <p className="text-xs text-muted-foreground mt-1">手动录入报工信息</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <p className="font-medium">我的工时</p>
              <p className="text-xs text-muted-foreground mt-1">查看今日工作记录</p>
            </CardContent>
          </Card>
        </div>

        {/* 今日报工记录 */}
        <Card>
          <CardHeader>
            <CardTitle>今日报工记录</CardTitle>
            <CardDescription>实时报工数据，效率低于80%自动预警</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>报工单号</TableHead>
                  <TableHead>工单</TableHead>
                  <TableHead>工序</TableHead>
                  <TableHead>员工</TableHead>
                  <TableHead>设备</TableHead>
                  <TableHead className="text-right">良品</TableHead>
                  <TableHead className="text-right">报废</TableHead>
                  <TableHead className="text-right">效率</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono">{report.id}</TableCell>
                    <TableCell className="font-mono">{report.workOrder}</TableCell>
                    <TableCell>{report.process}</TableCell>
                    <TableCell>{report.employee}</TableCell>
                    <TableCell>{report.equipment}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {report.goodQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {report.scrapQty > 0 ? report.scrapQty : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={report.efficiency < 80 ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}>
                        {report.efficiency}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {report.status === 'warning' ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          预警
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">正常</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{report.reportedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 扫码弹窗 */}
        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {scanStep === 'employee' && '扫工牌'}
                {scanStep === 'equipment' && '扫机台码'}
                {scanStep === 'workorder' && '扫工单码'}
              </DialogTitle>
              <DialogDescription>
                使用PDA扫描或手动输入编码，按回车确认
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 进度指示器 */}
              <div className="flex gap-2 mb-4">
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.employee ? 'bg-green-500' : scanStep === 'employee' ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.equipment ? 'bg-green-500' : scanStep === 'equipment' ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.workorder ? 'bg-green-500' : scanStep === 'workorder' ? 'bg-blue-500' : 'bg-gray-200'}`} />
              </div>

              <div className="space-y-2">
                <Label>
                  {scanStep === 'employee' && '工牌编码'}
                  {scanStep === 'equipment' && '机台编码'}
                  {scanStep === 'workorder' && '工单编码'}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="扫描或输入编码..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputCode.trim()) {
                        handleScan(scanStep, inputCode.trim());
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => inputCode.trim() && handleScan(scanStep, inputCode.trim())}
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 快速选择 */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">快速选择</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {scanStep === 'employee' && employees.map((emp) => (
                    <Button
                      key={emp.code}
                      variant="outline"
                      size="sm"
                      onClick={() => handleScan('employee', emp.code)}
                      className="justify-start"
                    >
                      <User className="h-3 w-3 mr-2" />
                      {emp.name}
                    </Button>
                  ))}
                  {scanStep === 'equipment' && equipments.map((eq) => (
                    <Button
                      key={eq.code}
                      variant="outline"
                      size="sm"
                      onClick={() => handleScan('equipment', eq.code)}
                      className="justify-start"
                    >
                      <Factory className="h-3 w-3 mr-2" />
                      {eq.name}
                    </Button>
                  ))}
                  {scanStep === 'workorder' && workOrders.map((wo) => (
                    <Button
                      key={wo.code}
                      variant="outline"
                      size="sm"
                      onClick={() => handleScan('workorder', wo.code)}
                      className="justify-start"
                    >
                      <QrCode className="h-3 w-3 mr-2" />
                      {wo.code}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanOpen(false)}>
                取消
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
