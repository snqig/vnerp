'use client';

import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
} from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';

// 模块配置
const modules = [
  {
    title: tc('text_hytrqw'),
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: tc('text_5ov82e'),
    features: [tc('text_5rdb06'), tc('text_5o6tmn'), tc('text_bm9j2n'), tc('text_8nmok4')],
    links: [
      { label: tc('text_j5p8kh'), href: '/orders/sales' },
      { label: tc('text_byypy2'), href: '/orders/customers' },
      { label: tc('text_aa1xa7'), href: '/orders/products' },
      { label: tc('text_12c46d'), href: '/orders/bom' },
    ],
    status: tc('text_e7l8k'),
  },
  {
    title: tc('text_cu3n96'),
    icon: Printer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: tc('text_43db31'),
    features: [tc('text_iq2kz2'), tc('text_jo1tyf'), tc('text_csul00'), tc('text_7expc6')],
    links: [
      { label: tc('text_cuaiy0'), href: '/sample/request' },
      { label: tc('text_cu691w'), href: '/sample/orders' },
    ],
    status: tc('text_502lap'),
  },
  {
    title: tc('text_acd50l'),
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: tc('text_pr07hs'),
    features: [tc('text_kza5f2'), tc('text_gf8f7m'), tc('text_d0intk'), tc('text_lwwunp')],
    links: [
      { label: tc('text_cbberm'), href: '/warehouse/inventory' },
      { label: tc('text_ao1adv'), href: '/warehouse/inbound' },
      { label: tc('text_aqoffi'), href: '/warehouse/outbound' },
      { label: tc('text_acfxxs'), href: '/warehouse/setup' },
    ],
    status: tc('text_e7l8k'),
  },
  {
    title: tc('text_f3xa0d'),
    icon: Factory,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: tc('text_ftt4ox'),
    features: [tc('text_hhi3c'), tc('text_xwneu7'), tc('text_pe4mvh'), tc('text_uinwdj')],
    links: [
      { label: tc('text_f3s1h4'), href: '/production/orders' },
      { label: tc('text_f3swnc'), href: '/production/report' },
      { label: tc('text_i05oi6'), href: '/production/equipment' },
      { label: tc('text_b1bsgi'), href: '/production/employees' },
    ],
    status: tc('text_e7l8k'),
  },
  {
    title: tc('text_ba41n0'),
    icon: ClipboardCheck,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: tc('text_9xmiui'),
    features: [tc('text_mkg3ze'), tc('text_4tq0pa'), tc('text_b8mcsy'), tc('text_lvcuzy')],
    links: [
      { label: tc('text_imiq27'), href: '/quality/trace' },
      { label: tc('text_dgvhr4'), href: '/quality/incoming' },
      { label: tc('text_caaack'), href: '/quality/patrol' },
      { label: tc('text_adxwqs'), href: '/quality/defect' },
    ],
    status: tc('text_e7l8k'),
  },
  {
    title: tc('text_iz76ff'),
    icon: ShoppingCart,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    description: tc('text_rx4tn3'),
    features: [tc('text_e014ib'), tc('text_vm0tcm'), tc('text_cvjcsu'), tc('text_etx0ro')],
    links: [
      { label: tc('text_iz9pyx'), href: '/purchase/orders' },
      { label: tc('text_iz67sa'), href: '/purchase/request' },
      { label: tc('text_vlts4u'), href: '/purchase/suppliers' },
      { label: tc('text_euvslx'), href: '/purchase/materials' },
    ],
    status: tc('text_e7l8k'),
  },
  {
    title: tc('text_bpix8n'),
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    description: tc('text_vgs7pg'),
    features: [tc('text_u3yf7m'), tc('text_aegk2c'), tc('text_xq7whr'), tc('text_csul00')],
    links: [
      { label: tc('text_bpdope'), href: '/outsource/orders' },
      { label: tc('text_bpm63x'), href: '/outsource/tracking' },
    ],
    status: tc('text_502lap'),
  },
  {
    title: tc('text_iooehv'),
    icon: Truck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    description: tc('text_5j21ny'),
    features: [tc('text_ga90gg'), tc('text_csr5z8'), tc('text_dky0p4'), tc('text_s99qhz')],
    links: [
      { label: tc('text_edpbax'), href: '/delivery/plan' },
      { label: tc('text_humgli'), href: '/delivery/loading' },
      { label: tc('text_bb8kxo'), href: '/delivery/receipt' },
    ],
    status: tc('text_502lap'),
  },
  {
    title: tc('text_i05oi6'),
    icon: Wrench,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: tc('text_aubvbm'),
    features: [tc('text_530qaq'), tc('text_53muf'), tc('text_oo429d'), tc('text_utn633')],
    links: [
      { label: tc('text_i02ccu'), href: '/equipment/list' },
      { label: tc('text_af8h8v'), href: '/equipment/maintenance' },
    ],
    status: tc('text_502lap'),
  },
  {
    title: tc('text_d7qb82'),
    icon: BarChart3,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    description: tc('text_ajqmnr'),
    features: [tc('text_9q1xni'), tc('text_stggif'), tc('text_uhsdu5'), tc('text_5lx15g')],
    links: [
      { label: tc('text_gz91y3'), href: '/dashboard/ceo' },
      { label: tc('text_f3wfgc'), href: '/dashboard/production' },
      { label: tc('text_accagk'), href: '/dashboard/warehouse' },
    ],
    status: tc('text_e7l8k'),
  },
];

// 三端协同场景
const terminalScenarios = [
  { terminal: 'PDA', user: tc('text_c54oa'), scene: tc('text_ayyzag'), action: tc('text_fgm6vd') },
  { terminal: 'PDA', user: tc('text_h90y0'), scene: tc('text_f4243f'), action: tc('text_72zcqv') },
  {
    terminal: tc('text_haa7'),
    user: tc('text_bucfl'),
    scene: tc('text_ijkglk'),
    action: tc('text_16jx4o'),
  },
  {
    terminal: tc('text_haa7'),
    user: tc('text_mc9q'),
    scene: tc('text_c773df'),
    action: tc('text_2stggv'),
  },
  {
    terminal: tc('text_haa7'),
    user: tc('text_c4b9p'),
    scene: tc('text_iqy4pv'),
    action: tc('text_jxfbh9'),
  },
  {
    terminal: tc('text_haa7'),
    user: tc('text_dgdk9'),
    scene: tc('text_bpct3f'),
    action: tc('text_vjb5as'),
  },
];

export default function ModulesPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const { companyName } = useCompanyName();
  return (
    <MainLayout title={t('systemModules')}>
      <div className="space-y-6">
        {/* 系统概述 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <QrCode className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">
                  {companyName}
                  {tc('text_141rk7')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('erpSystemDescription')}
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('fourWarehouseSeparation')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('fifoLocking')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('efficiencyAlert')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('fullTraceability')}</span>
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
              {t('triTerminalCollaboration')}
            </CardTitle>
            <CardDescription>{t('triTerminalDescription')}</CardDescription>
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
