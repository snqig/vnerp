'use client';
import { useTranslations } from 'next-intl';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth-fetch';

interface ProfitRow {
  productId: number | string;
  revenue: number;
  directCost: number;
  overhead: number;
  grossMargin: number;
  netMargin: number;
}

export default function CostAnalysisPage() {
  const ts = useTranslations('Common');
  const [_activeTab, _setActiveTab] = useState('profit');
  const [profitData, setProfitData] = useState<ProfitRow[]>([]);
  const [abcData, setAbcData] = useState<{ A: number[]; B: number[]; C: number[] }>({
    A: [],
    B: [],
    C: [],
  });

  useEffect(() => {
    authFetch('/api/advanced/cost-analysis', {
      method: 'POST',
      body: JSON.stringify({ action: 'profit-analysis' }),
    }).then(async (res) => {
      const data = await res.json();
      if (data.success) setProfitData(data.data);
    });
    authFetch('/api/advanced/cost-analysis', {
      method: 'POST',
      body: JSON.stringify({ action: 'abc-classification' }),
    }).then(async (res) => {
      const data = await res.json();
      if (data.success) setAbcData(data.data);
    });
  }, []);

  return (
    <MainLayout title={ts('k_1tht3uv')}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_jz14y7')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.A.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_1p8kqhe')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.B.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_797oqh')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.C.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{ts('k_we5x4g')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">{ts('k_1f46wps')}</th>
                  <th className="text-right p-2">{ts('k_bovgck')}</th>
                  <th className="text-right p-2">{ts('k_1jm63j2')}</th>
                  <th className="text-right p-2">{ts('k_5ux6bf')}</th>
                  <th className="text-right p-2">{ts('k_v25ve2')}</th>
                  <th className="text-right p-2">{ts('k_anob33')}</th>
                </tr>
              </thead>
              <tbody>
                {profitData.map((p: ProfitRow) => (
                  <tr key={p.productId} className="border-b">
                    <td className="p-2">#{p.productId}</td>
                    <td className="text-right p-2">¥{Number(p.revenue).toLocaleString()}</td>
                    <td className="text-right p-2">¥{Number(p.directCost).toLocaleString()}</td>
                    <td className="text-right p-2">¥{Number(p.overhead).toLocaleString()}</td>
                    <td
                      className={`text-right p-2 ${p.grossMargin < 20 ? 'text-red-500' : 'text-green-500'}`}
                    >
                      {p.grossMargin.toFixed(1)}%
                    </td>
                    <td
                      className={`text-right p-2 ${p.netMargin < 10 ? 'text-red-500' : 'text-green-500'}`}
                    >
                      {p.netMargin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
