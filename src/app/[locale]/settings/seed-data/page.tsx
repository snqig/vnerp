'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Users,
  ClipboardList,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SeedStats {
  [key: string]: number;
}

export default function SeedDataPage() {
  const ts = useTranslations('Common');
  const tc = useTranslations('Common');
  // 翻译钩子

  const [systemLoading, setSystemLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SeedStats | null>(null);
  const [businessStats, setBusinessStats] = useState<SeedStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSystemSeedData = async () => {
    setSystemLoading(true);
    setError(null);
    setSystemStats(null);

    try {
      const response = await authFetch('/api/init/settings-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSystemStats(result.data);
        toast.success(tc('seedSystemSuccess'));
      } else {
        setError(result.message || ts('k_145ng7n'));
        toast.error(result.message || ts('k_145ng7n'));
      }
    } catch (e) {
      setError((e as Error).message || ts('k_gsz8cc'));
      toast.error(ts('k_1pb71f5') + (e as Error).message);
    } finally {
      setSystemLoading(false);
    }
  };

  const runBusinessSeedData = async () => {
    setBusinessLoading(true);
    setError(null);
    setBusinessStats(null);

    try {
      const response = await authFetch('/api/init/business-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setBusinessStats(result.data);
        toast.success(tc('seedBusinessSuccess'));
      } else {
        setError(result.message || ts('k_145ng7n'));
        toast.error(result.message || ts('k_145ng7n'));
      }
    } catch (e) {
      setError((e as Error).message || ts('k_gsz8cc'));
      toast.error(ts('k_1pb71f5') + (e as Error).message);
    } finally {
      setBusinessLoading(false);
    }
  };

  return (
    <MainLayout title={ts('k_nuvho1')}>
      <div className="container mx-auto py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">{ts('k_145ng7n')}</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 系统数据种子 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {ts('k_82pa1u')}</CardTitle>
            <CardDescription>
              {ts('k_gm737h')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">{ts('k_et3mbk')}</h4>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1">
                    <li>{ts('k_i6vtfk')}</li>
                    <li>{ts('k_1t02ig2')}</li>
                    <li>{ts('k_1b2frda')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={runSystemSeedData}
              disabled={systemLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {systemLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {ts('k_mad3iu')}</>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  {ts('k_8hm841')}</>
              )}
            </Button>

            {systemStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">{ts('k_1bupk9o')}</h4>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(systemStats).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-white rounded"
                        >
                          <span className="text-sm text-gray-600">{key}</span>
                          <Badge variant="secondary">{value} {ts('k_1rfm5gs')}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 业务数据种子 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {ts('k_1b5yjm7')}</CardTitle>
            <CardDescription>
              {ts('k_1vbnd1t')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">{ts('k_et3mbk')}</h4>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1">
                    <li>{ts('k_brgoub')}</li>
                    <li>{ts('k_9ovkwn')}</li>
                    <li>{ts('k_kovkkk')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={runBusinessSeedData}
              disabled={businessLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {businessLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {ts('k_mad3iu')}</>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {ts('k_1b6xb8u')}</>
              )}
            </Button>

            {businessStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">{ts('k_z7xbn9')}</h4>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(businessStats).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-white rounded"
                        >
                          <span className="text-sm text-gray-600">{key}</span>
                          <Badge variant="secondary">{value} {ts('k_1rfm5gs')}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据说明 */}
        <Card>
          <CardHeader>
            <CardTitle>{ts('k_3h9k4x')}</CardTitle>
            <CardDescription>{ts('k_i99yy3')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {ts('k_62x2g9')}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>{ts('k_h0yqyz')}</p>
                  <p>{ts('k_12rgmfw')}</p>
                  <p>{ts('k_9kako7')}</p>
                  <p>{ts('k_gp7qhy')}</p>
                  <p>{ts('k_4u10gj')}</p>
                  <p>{ts('k_1pbbi5m')}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {ts('k_xummk6')}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>{ts('k_1e6uaoo')}</p>
                  <p>{ts('k_1o5vlhv')}</p>
                  <p>{ts('k_1u4qg8l')}</p>
                  <p>{ts('k_752sgs')}</p>
                  <p>{ts('k_xds3c3')}</p>
                  <p>{ts('k_ocjr1j')}</p>
                  <p>{ts('k_180rdvi')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 默认账号密码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {ts('k_1un0tzv')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { username: 'admin', role: ts('k_1fcdmqa'), password: 'admin123' },
                { username: 'zhangwei', role: ts('k_ojn305'), password: 'admin123' },
                { username: 'lina', role: ts('k_15vw6tw'), password: 'admin123' },
                { username: 'wangqiang', role: ts('k_1tyjla3'), password: 'admin123' },
                { username: 'liuyang', role: ts('k_d1s7gj'), password: 'admin123' },
              ].map((user) => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{user.role}</Badge>
                    <span className="font-mono">{user.username}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {user.password}
                  </Badge>
                </div>
              ))}
              <p className="text-sm text-gray-500 mt-4">{ts('k_xvtbw4')}</p>
            </div>
          </CardContent>
        </Card>

        {/* 快速导航 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {ts('k_1bld6m1')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => window.open('/settings/user', '_blank')}>
                {ts('k_1oim33')}</Button>
              <Button
                variant="outline"
                onClick={() => window.open('/settings/organization', '_blank')}
              >
                {ts('k_1gn6di0')}</Button>
              <Button variant="outline" onClick={() => window.open('/warehouse/inbound', '_blank')}>
                {ts('k_pep7q2')}</Button>
              <Button variant="outline" onClick={() => window.open('/dcprint/labels', '_blank')}>
                {ts('k_1anu4hj')}</Button>
              <Button variant="outline" onClick={() => window.open('/dashboard/quality', '_blank')}>
                {ts('k_11wyqof')}</Button>
              <Button variant="outline" onClick={() => window.open('/orders/sales', '_blank')}>
                {ts('k_m6144y')}</Button>
              <Button
                variant="outline"
                onClick={() => window.open('/production/work-orders', '_blank')}
              >
                {ts('k_1h58b1')}</Button>
              <Button
                variant="outline"
                onClick={() => window.open('/warehouse/inventory', '_blank')}
              >
                {ts('k_1s6r84h')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
