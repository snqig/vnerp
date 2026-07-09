'use client';

import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Scissors, FileText, Search, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// 功能模块
const modules = [
  {
    title: tc('text_18vvxo'),
    description: tc('text_q4gmqv'),
    icon: QrCode,
    href: '/dcprint/labels',
    color: 'bg-blue-500',
    stats: tc('text_d7sljy'),
  },
  {
    title: tc('text_eurv9t'),
    description: tc('text_mxiu5g'),
    icon: Scissors,
    href: '/warehouse/inbound/cutting',
    color: 'bg-green-500',
    stats: tc('text_u9u8z2'),
  },
  {
    title: tc('text_sw72y9'),
    description: tc('text_g5tro1'),
    icon: FileText,
    href: '/dcprint/process-cards',
    color: 'bg-purple-500',
    stats: tc('text_ym8o7l'),
  },
  {
    title: tc('text_ev2kde'),
    description: tc('text_h8mb5x'),
    icon: Search,
    href: '/dcprint/trace',
    color: 'bg-orange-500',
    stats: tc('text_r5mxot'),
  },
];

// 快捷操作
const quickActions = [
  { label: tc('text_ctwbd1'), icon: Scissors, href: '/warehouse/inbound/cutting' },
  { label: tc('text_qg294q'), icon: FileText, href: '/dcprint/process-cards' },
  { label: tc('text_imiq27'), icon: Search, href: '/dcprint/trace' },
  { label: tc('text_dn1dss'), icon: QrCode, href: '/dcprint/labels' },
];

// 统计数据
const stats = [
  { label: tc('text_ad2q8s'), value: '0', icon: Scissors, color: 'text-green-600' },
  { label: tc('text_xs0tqc'), value: '0', icon: FileText, color: 'text-purple-600' },
  { label: tc('text_addfcd'), value: '0', icon: Search, color: 'text-orange-600' },
  { label: tc('text_dmwn58'), value: '0', icon: QrCode, color: 'text-blue-600' },
];

export default function DCPrintPage() {
  // 翻译钩子
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');

  return (
    <MainLayout title="全程二维码追溯系统">
      <div className="space-y-6">
        {/* 欢迎区域 */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{tc('text_h8ptpo')}</h1>
                <p className="text-blue-100">{tc('text_1oztkz')}</p>
              </div>
              <div className="flex gap-3">
                <Link href="/warehouse/inbound/cutting">
                  <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                    <Scissors className="h-4 w-4 mr-2" />
                    {tc('text_ccwslo')}
                  </Button>
                </Link>
                <Link href="/dcprint/process-cards">
                  <Button
                    variant="secondary"
                    className="bg-white text-purple-600 hover:bg-purple-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {tc('text_qg294q')}
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
                      <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
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
            <CardTitle>{tc('text_cil0yj')}</CardTitle>
            <CardDescription>{tc('text_bcu9r4')}</CardDescription>
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
            <CardTitle>{tc('text_gaqy1q')}</CardTitle>
            <CardDescription>{tc('text_2ahj2k')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-blue-100 text-blue-600">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{tc('text_9gtzkr')}</h4>
                  <p className="text-sm text-muted-foreground">{tc('text_r0lwcf')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-green-100 text-green-600">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{tc('text_eurv9t')}</h4>
                  <p className="text-sm text-muted-foreground">{tc('text_kg3hvm')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-purple-100 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{tc('text_sw72y9')}</h4>
                  <p className="text-sm text-muted-foreground">{tc('text_4gbp8t')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-orange-100 text-orange-600">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{tc('text_as7h9x')}</h4>
                  <p className="text-sm text-muted-foreground">{tc('text_t6539f')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
