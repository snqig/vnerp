'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Database, RefreshCw, CheckCircle, XCircle, AlertTriangle, Package, Users, ClipboardList } from 'lucide-react';

interface SeedStats {
  [key: string]: number;
}

export default function SeedDataPage() {
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
      const response = await fetch('/api/init/settings-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSystemStats(result.data);
        toast.success('系统数据种子初始化成功！');
      } else {
        setError(result.message || '初始化失败');
        toast.error(result.message || '初始化失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
      toast.error('初始化失败: ' + e.message);
    } finally {
      setSystemLoading(false);
    }
  };

  const runBusinessSeedData = async () => {
    setBusinessLoading(true);
    setError(null);
    setBusinessStats(null);

    try {
      const response = await fetch('/api/init/business-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setBusinessStats(result.data);
        toast.success('业务数据种子初始化成功！');
      } else {
        setError(result.message || '初始化失败');
        toast.error(result.message || '初始化失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
      toast.error('初始化失败: ' + e.message);
    } finally {
      setBusinessLoading(false);
    }
  };

  return (
    <MainLayout title="数据种子管理">
      <div className="container mx-auto py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">初始化失败</h4>
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
              系统数据种子初始化
            </CardTitle>
            <CardDescription>
              初始化系统基础数据，包括部门、角色、用户、仓库分类、物料分类、字典配置等。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">注意事项</h4>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1">
                    <li>• 此操作会清空系统设置相关表的数据</li>
                    <li>• 建议在首次部署或需要重置系统配置时使用</li>
                    <li>• 初始化后默认管理员账号：admin，密码：admin123</li>
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
                  初始化中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  初始化系统数据
                </>
              )}
            </Button>

            {systemStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">系统数据初始化成功</h4>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(systemStats).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm text-gray-600">{key}</span>
                          <Badge variant="secondary">{value} 条</Badge>
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
              业务数据种子初始化
            </CardTitle>
            <CardDescription>
              初始化业务数据，包括客户、销售订单、生产工单、入库单、物料标签、库存、质量检验记录等。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">注意事项</h4>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1">
                    <li>• 此操作会清空业务相关表的数据</li>
                    <li>• 建议在需要重置业务数据时使用</li>
                    <li>• 包含演示用的真实业务场景数据</li>
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
                  初始化中...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  初始化业务数据
                </>
              )}
            </Button>

            {businessStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">业务数据初始化成功</h4>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(businessStats).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm text-gray-600">{key}</span>
                          <Badge variant="secondary">{value} 条</Badge>
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
            <CardTitle>数据说明</CardTitle>
            <CardDescription>初始化后将包含以下数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  系统数据
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 10个部门（管理部、业务部、工程技术部等）</p>
                  <p>• 10个角色（超级管理员、业务经理、业务员等）</p>
                  <p>• 10个用户（admin、zhangwei、lina等）</p>
                  <p>• 10个仓库分类（原材料仓、半成品仓、成品仓等）</p>
                  <p>• 10个物料分类（薄膜材料、油墨材料等）</p>
                  <p>• 100+条字典数据（仓库类型、物料类型等）</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  业务数据
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 5个客户（美的集团、格力电器、海尔集团等）</p>
                  <p>• 10个销售订单</p>
                  <p>• 8个生产工单</p>
                  <p>• 8个入库单</p>
                  <p>• 10个物料标签</p>
                  <p>• 6个库存记录</p>
                  <p>• 10个质量检验记录</p>
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
              默认账号密码
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { username: 'admin', role: '超级管理员', password: 'admin123' },
                { username: 'zhangwei', role: '业务经理', password: 'admin123' },
                { username: 'lina', role: '业务员', password: 'admin123' },
                { username: 'wangqiang', role: '工程师', password: 'admin123' },
                { username: 'liuyang', role: '生产主管', password: 'admin123' },
              ].map((user) => (
                <div key={user.username} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{user.role}</Badge>
                    <span className="font-mono">{user.username}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono">{user.password}</Badge>
                </div>
              ))}
              <p className="text-sm text-gray-500 mt-4">提示：首次登录后建议修改密码</p>
            </div>
          </CardContent>
        </Card>

        {/* 快速导航 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              快速导航
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => window.open('/settings/user', '_blank')}>
                用户管理
              </Button>
              <Button variant="outline" onClick={() => window.open('/settings/organization', '_blank')}>
                组织设置
              </Button>
              <Button variant="outline" onClick={() => window.open('/warehouse/inbound', '_blank')}>
                入库管理
              </Button>
              <Button variant="outline" onClick={() => window.open('/dcprint/labels', '_blank')}>
                标签管理
              </Button>
              <Button variant="outline" onClick={() => window.open('/dashboard/quality', '_blank')}>
                质量仪表板
              </Button>
              <Button variant="outline" onClick={() => window.open('/orders/sales', '_blank')}>
                销售订单
              </Button>
              <Button variant="outline" onClick={() => window.open('/production/work-orders', '_blank')}>
                生产工单
              </Button>
              <Button variant="outline" onClick={() => window.open('/warehouse/inventory', '_blank')}>
                库存管理
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
