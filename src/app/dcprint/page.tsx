'use client';

import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Scissors,
  FileText,
  Search,
  Package,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// 功能模块
const modules = [
  {
    title: '物料标签管理',
    description: '管理物料标签，支持二维码追溯',
    icon: QrCode,
    href: '/dcprint/labels',
    color: 'bg-blue-500',
    stats: '标签总数: 0',
  },
  {
    title: '物料分切',
    description: '扫描标签进行分切操作',
    icon: Scissors,
    href: '/warehouse/inbound/cutting',
    color: 'bg-green-500',
    stats: '今日分切: 0',
  },
  {
    title: '生产流程卡',
    description: '生成和管理生产流程卡',
    icon: FileText,
    href: '/dcprint/process-cards',
    color: 'bg-purple-500',
    stats: '流程卡数: 0',
  },
  {
    title: '物料追溯',
    description: '全程二维码追溯查询',
    icon: Search,
    href: '/dcprint/trace',
    color: 'bg-orange-500',
    stats: '追溯记录: 0',
  },
];

// 快捷操作
const quickActions = [
  { label: '扫描分切', icon: Scissors, href: '/warehouse/inbound/cutting' },
  { label: '生成流程卡', icon: FileText, href: '/dcprint/process-cards' },
  { label: '追溯查询', icon: Search, href: '/dcprint/trace' },
  { label: '标签管理', icon: QrCode, href: '/dcprint/labels' },
];

// 统计数据
const stats = [
  { label: '今日分切', value: '0', icon: Scissors, color: 'text-green-600' },
  { label: '今日流程卡', value: '0', icon: FileText, color: 'text-purple-600' },
  { label: '今日追溯', value: '0', icon: Search, color: 'text-orange-600' },
  { label: '标签总数', value: '0', icon: QrCode, color: 'text-blue-600' },
];

export default function DCPrintPage() {
  return (
    <MainLayout title="全程二维码追溯系统">
      <div className="space-y-6">
        {/* 欢迎区域 */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">全程二维码追溯系统</h1>
                <p className="text-blue-100">
                  仓库先进先出 · 物料分切 · 生产流程卡 · 全程追溯
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/warehouse/inbound/cutting">
                  <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                    <Scissors className="h-4 w-4 mr-2" />
                    开始分切
                  </Button>
                </Link>
                <Link href="/dcprint/process-cards">
                  <Button variant="secondary" className="bg-white text-purple-600 hover:bg-purple-50">
                    <FileText className="h-4 w-4 mr-2" />
                    生成流程卡
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计数据 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 功能模块 */}
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <Link key={module.title} href={module.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${module.color} text-white`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{module.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{module.stats}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <action.icon className="h-5 w-5" />
                    <span>{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 系统说明 */}
        <Card>
          <CardHeader>
            <CardTitle>系统说明</CardTitle>
            <CardDescription>全程二维码追溯系统功能介绍</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-blue-100 text-blue-600">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">仓库先进先出</h4>
                  <p className="text-sm text-muted-foreground">
                    通过二维码标签管理物料入库、出库，实现先进先出的库存管理
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-green-100 text-green-600">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">物料分切</h4>
                  <p className="text-sm text-muted-foreground">
                    支持母材分切操作，自动生成分切后的新标签，保持追溯链完整
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-purple-100 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">生产流程卡</h4>
                  <p className="text-sm text-muted-foreground">
                    扫描工单和物料生成流程卡，关联主材和辅料，支持配料管理
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-orange-100 text-orange-600">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">全程追溯</h4>
                  <p className="text-sm text-muted-foreground">
                    通过流程卡二维码追溯产品使用的所有物料信息，支持正向和反向追溯
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
