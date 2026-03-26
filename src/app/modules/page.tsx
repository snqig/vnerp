'use client';

import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  FileText,
  Package,
  Factory,
  ClipboardCheck,
  ShoppingCart,
  Truck,
  Wrench,
  BarChart3,
  Printer,
  QrCode,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// 模块配置
const modules = [
  {
    title: '订单管理',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: '销售订单、客户档案、产品档案、BOM管理',
    features: ['订单录入与跟踪', '客户信用管理', '产品BOM版本管理', '订单进度监控'],
    links: [
      { label: '销售订单', href: '/orders/sales' },
      { label: '客户档案', href: '/orders/customers' },
      { label: '产品档案', href: '/orders/products' },
      { label: 'BOM管理', href: '/orders/bom' },
    ],
    status: '已实现',
  },
  {
    title: '打样中心',
    icon: Printer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: '打样申请、打样工单、样品管理',
    features: ['打样申请流程', '领料联动', '成本归集', '样品转量产'],
    links: [
      { label: '打样申请', href: '/sample/request' },
      { label: '打样工单', href: '/sample/orders' },
    ],
    status: '框架已搭建',
  },
  {
    title: '仓库管理',
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: '四仓分离、批次追溯、先进先出、库存预警',
    features: ['四仓分离管理', '先进先出锁定', '批次血缘继承', '库存预警系统'],
    links: [
      { label: '库存查询', href: '/warehouse/inventory' },
      { label: '入库管理', href: '/warehouse/inbound' },
      { label: '出库管理', href: '/warehouse/outbound' },
      { label: '仓库设置', href: '/warehouse/setup' },
    ],
    status: '已实现',
  },
  {
    title: '生产管理',
    icon: Factory,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: '工单管理、生产报工、效率预警、设备管理',
    features: ['工单排产调度', '三扫码报工', '效率实时监控', '设备状态管理'],
    links: [
      { label: '生产工单', href: '/production/orders' },
      { label: '生产报工', href: '/production/report' },
      { label: '设备管理', href: '/production/equipment' },
      { label: '员工管理', href: '/production/employees' },
    ],
    status: '已实现',
  },
  {
    title: '品质管理',
    icon: ClipboardCheck,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: '来料检验、首件确认、巡检SPC、售后追溯',
    features: ['全流程拦截', 'SPC统计分析', '膜厚/色差记录', '3秒追溯查询'],
    links: [
      { label: '追溯查询', href: '/quality/trace' },
      { label: '来料检验', href: '/quality/incoming' },
      { label: '巡检记录', href: '/quality/patrol' },
      { label: '不良处理', href: '/quality/defect' },
    ],
    status: '已实现',
  },
  {
    title: '采购管理',
    icon: ShoppingCart,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    description: '采购申请、采购订单、供应商协同、PDF送货码',
    features: ['双来源请购', '供应商协同', 'PDF扫码送货', '采购进度跟踪'],
    links: [
      { label: '采购订单', href: '/purchase/orders' },
      { label: '采购申请', href: '/purchase/request' },
      { label: '供应商管理', href: '/purchase/suppliers' },
      { label: '物料档案', href: '/purchase/materials' },
    ],
    status: '已实现',
  },
  {
    title: '委外管理',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    description: '委外工单、委外跟踪、损耗管理、应付锁定',
    features: ['委外二维码跟踪', '超损耗自动锁定', '外协厂手机回货', '成本归集'],
    links: [
      { label: '委外工单', href: '/outsource/orders' },
      { label: '委外跟踪', href: '/outsource/tracking' },
    ],
    status: '框架已搭建',
  },
  {
    title: '车辆派送',
    icon: Truck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    description: '智能排车、装车确认、电子回单、对账支持',
    features: ['智能车型推荐', 'PDA扫码装车', '电子回单上传', '派送进度跟踪'],
    links: [
      { label: '派车计划', href: '/delivery/plan' },
      { label: '装车管理', href: '/delivery/loading' },
      { label: '回单管理', href: '/delivery/receipt' },
    ],
    status: '框架已搭建',
  },
  {
    title: '设备管理',
    icon: Wrench,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: '设备档案、保养计划、备件管理、故障报修',
    features: ['一机一档一码', '保养自动触发', '未保养锁定工单', '备件寿命预警'],
    links: [
      { label: '设备档案', href: '/equipment/list' },
      { label: '保养计划', href: '/equipment/maintenance' },
    ],
    status: '框架已搭建',
  },
  {
    title: '数据看板',
    icon: BarChart3,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    description: '老板驾驶舱、生产看板、仓库看板、品质看板',
    features: ['实时数据大屏', '效率监控预警', '库存周转分析', '品质合格率'],
    links: [
      { label: '老板驾驶舱', href: '/dashboard/ceo' },
      { label: '生产看板', href: '/dashboard/production' },
      { label: '仓库看板', href: '/dashboard/warehouse' },
    ],
    status: '已实现',
  },
];

// 三端协同场景
const terminalScenarios = [
  { terminal: 'PDA', user: '仓管员', scene: '原料入库', action: '扫描送货单码+实物码，上架' },
  { terminal: 'PDA', user: '物料员', scene: '生产领料', action: '扫工单码，按先进先出取货' },
  { terminal: '手机', user: '业务员', scene: '进度查询', action: '扫订单PDF存图，看完整节点' },
  { terminal: '手机', user: '老板', scene: '巡厂追溯', action: '扫任意在制品码，穿透追溯' },
  { terminal: '手机', user: '供应商', scene: '送货协同', action: '扫PDF码，填发货信息' },
  { terminal: '手机', user: '外协厂', scene: '委外回货', action: '扫委外码，输数量拍照' },
];

export default function ModulesPage() {
  return (
    <MainLayout title="系统模块">
      <div className="space-y-6">
        {/* 系统概述 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <QrCode className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">越南达昌丝网印刷科技有限公司 ERP系统</h2>
                <p className="text-muted-foreground mb-4">
                  专为解决丝网印刷企业"订单杂、批次多、交期短、工序长"的特性而设计。
                  以二维码为唯一数据载体，通过工业PDA+手机+PDF三端协同，
                  打通从业务接单到车辆派送的全链路闭环。
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">四仓分离管理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">先进先出锁定</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">效率预警</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">全流程追溯</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 三端协同 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              三端协同场景
            </CardTitle>
            <CardDescription>工业PDA、手机、PDF二维码三端无缝协同</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {terminalScenarios.map((s, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant={s.terminal === 'PDA' ? 'default' : 'secondary'}>
                    {s.terminal}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{s.scene}</span>
                      <span className="text-xs text-muted-foreground">({s.user})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 模块卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${module.bgColor}`}>
                      <module.icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {module.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                <div className="space-y-2 mb-4">
                  {module.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {module.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="outline" size="sm">
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
