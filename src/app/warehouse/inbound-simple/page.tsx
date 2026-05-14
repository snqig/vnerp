'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InboundRecord {
  id: number;
  order_no: string;
  inbound_date: string;
  supplier_name: string;
  total_quantity: number;
  status: string;
  items?: any[];
}

export default function SimpleInboundPage() {
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const [records, setRecords] = useState<InboundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authFetch('/api/warehouse/inbound?page=1&pageSize=100');
        const result = await response.json();

        if (result.success) {
          const list = result.data?.list || result.data || [];
          console.log('获取到数据:', list.length, '条');
          setRecords(list);
        } else {
          console.log('API返回失败:', result.message);
          setError(result.message);
        }
      } catch (e: any) {
        console.log('请求异常:', e.message);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    approved: '已审核',
    completed: '已完成',
    cancelled: '已取消'
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };

  return (
    <MainLayout title="入库管理（简化版）">
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>入库记录列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>加载中...</p>}
            {error && <p className="text-red-600">错误: {error}</p>}

            {!loading && !error && (
              <>
                <p className="mb-4">共 {records.length} 条记录</p>
                <div className="space-y-4">
                  {records.length === 0 ? (
                    <p className="text-gray-500">暂无数据</p>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        className="border p-4 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{record.order_no}</p>
                          <p className="text-sm text-gray-500">
                            {record.supplier_name} | {record.total_quantity}件
                          </p>
                          <p className="text-sm text-gray-400">
                            {record.inbound_date}
                          </p>
                        </div>
                        <Badge className={statusColors[record.status] || 'bg-gray-100'}>
                          {statusLabels[record.status] || record.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
