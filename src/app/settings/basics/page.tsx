'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Settings,
  Save,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Bell,
  Mail,
  Palette,
  Globe,
} from 'lucide-react';

// 系统参数
const systemParams = {
  company: {
    name: '苏州达昌印刷科技有限公司',
    shortName: '达昌印刷',
    code: 'DC-PRINT',
  },
  business: {
    currency: 'CNY',
    taxRate: 13,
    decimalPlaces: 2,
    pricePrecision: 4,
  },
  datetime: {
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    timezone: 'Asia/Shanghai',
    firstDayOfWeek: 'Monday',
  },
  numbering: {
    orderPrefix: 'SO',
    purchasePrefix: 'PO',
    workOrderPrefix: 'WO',
    samplePrefix: 'SP',
    serialLength: 6,
  },
};

// 数据字典
const dataDicts = [
  {
    id: 'material_type',
    name: '物料类型',
    code: 'MATERIAL_TYPE',
    items: [
      { id: '1', code: 'RAW', name: '原材料', sort: 1 },
      { id: '2', code: 'INK', name: '油墨', sort: 2 },
      { id: '3', code: 'AUX', name: '辅料', sort: 3 },
      { id: '4', code: 'PACK', name: '包装材料', sort: 4 },
      { id: '5', code: 'PROD', name: '成品', sort: 5 },
    ],
  },
  {
    id: 'order_status',
    name: '订单状态',
    code: 'ORDER_STATUS',
    items: [
      { id: '1', code: 'DRAFT', name: '草稿', sort: 1 },
      { id: '2', code: 'PENDING', name: '待确认', sort: 2 },
      { id: '3', code: 'CONFIRMED', name: '已确认', sort: 3 },
      { id: '4', code: 'IN_PRODUCTION', name: '生产中', sort: 4 },
      { id: '5', code: 'COMPLETED', name: '已完成', sort: 5 },
      { id: '6', code: 'CANCELLED', name: '已取消', sort: 6 },
    ],
  },
  {
    id: 'payment_method',
    name: '付款方式',
    code: 'PAYMENT_METHOD',
    items: [
      { id: '1', code: 'CASH', name: '现金', sort: 1 },
      { id: '2', code: 'TRANSFER', name: '银行转账', sort: 2 },
      { id: '3', code: 'CHECK', name: '支票', sort: 3 },
      { id: '4', code: 'CREDIT', name: '信用证', sort: 4 },
    ],
  },
  {
    id: 'delivery_method',
    name: '交货方式',
    code: 'DELIVERY_METHOD',
    items: [
      { id: '1', code: 'SELF', name: '自提', sort: 1 },
      { id: '2', code: 'DELIVERY', name: '送货上门', sort: 2 },
      { id: '3', code: 'EXPRESS', name: '快递', sort: 3 },
      { id: '4', code: 'LOGISTICS', name: '物流', sort: 4 },
    ],
  },
  {
    id: 'unit',
    name: '计量单位',
    code: 'UNIT',
    items: [
      { id: '1', code: 'PC', name: '个', sort: 1 },
      { id: '2', code: 'SET', name: '套', sort: 2 },
      { id: '3', code: 'KG', name: '千克', sort: 3 },
      { id: '4', code: 'M', name: '米', sort: 4 },
      { id: '5', code: 'M2', name: '平方米', sort: 5 },
      { id: '6', code: 'ROLL', name: '卷', sort: 6 },
    ],
  },
];

// 通知设置
const notificationSettings = [
  {
    id: 'order_create',
    name: '订单创建通知',
    description: '当有新订单创建时发送通知',
    email: true,
    sms: false,
    app: true,
  },
  {
    id: 'order_approve',
    name: '订单审批通知',
    description: '订单需要审批时通知相关负责人',
    email: true,
    sms: true,
    app: true,
  },
  {
    id: 'production_complete',
    name: '生产完成通知',
    description: '生产工单完成时通知业务人员',
    email: true,
    sms: false,
    app: true,
  },
  {
    id: 'quality_exception',
    name: '品质异常通知',
    description: '发现品质异常时立即通知',
    email: true,
    sms: true,
    app: true,
  },
  {
    id: 'inventory_warning',
    name: '库存预警通知',
    description: '库存低于安全库存时发送预警',
    email: true,
    sms: false,
    app: true,
  },
  {
    id: 'delivery_remind',
    name: '交货提醒',
    description: '订单临近交货日期时提醒',
    email: true,
    sms: false,
    app: false,
  },
];

export default function BasicsSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedDict, setSelectedDict] = useState(dataDicts[0]);
  const [isEditDictOpen, setIsEditDictOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  return (
    <MainLayout title="基础设置">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="general">通用设置</TabsTrigger>
            <TabsTrigger value="numbering">编码规则</TabsTrigger>
            <TabsTrigger value="dictionary">数据字典</TabsTrigger>
            <TabsTrigger value="notification">通知设置</TabsTrigger>
          </TabsList>

          {/* 通用设置 */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  业务参数
                </CardTitle>
                <CardDescription>配置系统的基本业务参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      默认币种
                    </Label>
                    <Select defaultValue="CNY">
                      <SelectTrigger>
                        <SelectValue placeholder="选择币种" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                        <SelectItem value="USD">美元 (USD)</SelectItem>
                        <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                        <SelectItem value="JPY">日元 (JPY)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>默认税率 (%)</Label>
                    <Input type="number" defaultValue={13} />
                  </div>
                  <div className="space-y-2">
                    <Label>金额小数位数</Label>
                    <Select defaultValue="2">
                      <SelectTrigger>
                        <SelectValue placeholder="选择位数" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0位</SelectItem>
                        <SelectItem value="2">2位</SelectItem>
                        <SelectItem value="4">4位</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>单价精度</Label>
                    <Select defaultValue="4">
                      <SelectTrigger>
                        <SelectValue placeholder="选择精度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2位</SelectItem>
                        <SelectItem value="4">4位</SelectItem>
                        <SelectItem value="6">6位</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  日期时间
                </CardTitle>
                <CardDescription>配置日期时间显示格式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>日期格式</Label>
                    <Select defaultValue="YYYY-MM-DD">
                      <SelectTrigger>
                        <SelectValue placeholder="选择格式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="YYYY/MM/DD">YYYY/MM/DD</SelectItem>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>时间格式</Label>
                    <Select defaultValue="24h">
                      <SelectTrigger>
                        <SelectValue placeholder="选择格式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24小时制</SelectItem>
                        <SelectItem value="12h">12小时制</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      时区
                    </Label>
                    <Select defaultValue="Asia/Shanghai">
                      <SelectTrigger>
                        <SelectValue placeholder="选择时区" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Shanghai">北京时间 (Asia/Shanghai)</SelectItem>
                        <SelectItem value="Asia/Hong_Kong">香港时间 (Asia/Hong_Kong)</SelectItem>
                        <SelectItem value="Asia/Taipei">台北时间 (Asia/Taipei)</SelectItem>
                        <SelectItem value="Asia/Tokyo">东京时间 (Asia/Tokyo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      每周起始日
                    </Label>
                    <Select defaultValue="Monday">
                      <SelectTrigger>
                        <SelectValue placeholder="选择起始日" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monday">星期一</SelectItem>
                        <SelectItem value="Sunday">星期日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 编码规则 */}
          <TabsContent value="numbering" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  单据编码规则
                </CardTitle>
                <CardDescription>配置各类单据的编码前缀和规则</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>销售订单前缀</Label>
                    <Input defaultValue="SO" placeholder="如: SO" />
                  </div>
                  <div className="space-y-2">
                    <Label>采购订单前缀</Label>
                    <Input defaultValue="PO" placeholder="如: PO" />
                  </div>
                  <div className="space-y-2">
                    <Label>生产工单前缀</Label>
                    <Input defaultValue="WO" placeholder="如: WO" />
                  </div>
                  <div className="space-y-2">
                    <Label>打样工单前缀</Label>
                    <Input defaultValue="SP" placeholder="如: SP" />
                  </div>
                  <div className="space-y-2">
                    <Label>请购单前缀</Label>
                    <Input defaultValue="PR" placeholder="如: PR" />
                  </div>
                  <div className="space-y-2">
                    <Label>入库单前缀</Label>
                    <Input defaultValue="IN" placeholder="如: IN" />
                  </div>
                  <div className="space-y-2">
                    <Label>出库单前缀</Label>
                    <Input defaultValue="OUT" placeholder="如: OUT" />
                  </div>
                  <div className="space-y-2">
                    <Label>流水号长度</Label>
                    <Select defaultValue="6">
                      <SelectTrigger>
                        <SelectValue placeholder="选择长度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4位</SelectItem>
                        <SelectItem value="5">5位</SelectItem>
                        <SelectItem value="6">6位</SelectItem>
                        <SelectItem value="8">8位</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm text-muted-foreground mb-2 block">编码示例</Label>
                  <div className="space-y-1 text-sm">
                    <div>销售订单: SO20240315000001</div>
                    <div>采购订单: PO20240315000001</div>
                    <div>生产工单: WO20240315000001</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    保存规则
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 数据字典 */}
          <TabsContent value="dictionary" className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      字典分类
                    </CardTitle>
                    <CardDescription>选择要配置的数据字典</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dataDicts.map((dict) => (
                        <div
                          key={dict.id}
                          onClick={() => setSelectedDict(dict)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedDict.id === dict.id
                              ? 'bg-blue-50 border-2 border-blue-200'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="font-medium">{dict.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {dict.code} | {dict.items.length} 项
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {selectedDict.name}
                      </CardTitle>
                      <CardDescription>管理 {selectedDict.name} 的选项</CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingItem(null);
                        setIsEditDictOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增选项
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedDict.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{index + 1}</Badge>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                编码: {item.code} | 排序: {item.sort}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingItem(item);
                                setIsEditDictOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 编辑字典项弹窗 */}
            <Dialog open={isEditDictOpen} onOpenChange={setIsEditDictOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? '编辑选项' : '新增选项'}</DialogTitle>
                  <DialogDescription>
                    {editingItem ? '修改选项信息' : '添加新的选项到 ' + selectedDict.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>选项名称</Label>
                    <Input defaultValue={editingItem?.name} placeholder="请输入选项名称" />
                  </div>
                  <div className="space-y-2">
                    <Label>选项编码</Label>
                    <Input defaultValue={editingItem?.code} placeholder="请输入选项编码" />
                  </div>
                  <div className="space-y-2">
                    <Label>排序号</Label>
                    <Input
                      type="number"
                      defaultValue={editingItem?.sort || selectedDict.items.length + 1}
                      placeholder="请输入排序号"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDictOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setIsEditDictOpen(false)}>保存</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  通知配置
                </CardTitle>
                <CardDescription>配置系统各类通知的发送方式</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notificationSettings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{setting.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {setting.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked={setting.email} />
                          <Label className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            邮件
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked={setting.sms} />
                          <Label className="text-sm">短信</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked={setting.app} />
                          <Label className="text-sm">应用内</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    保存配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
