'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DebugInboundPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    console.log('[DebugInbound]', msg);
  };

  const testFetch = async () => {
    addLog('开始测试...');
    
    // 1. 检查token
    const token = localStorage.getItem('token');
    addLog(`Token存在: ${!!token}`);
    if (token) {
      addLog(`Token前50字符: ${token.substring(0, 50)}...`);
    }

    // 2. 获取用户信息
    const userStr = localStorage.getItem('user');
    addLog(`用户信息存在: ${!!userStr}`);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        addLog(`用户名: ${user.username}, 真实姓名: ${user.realName}`);
      } catch (e) {
        addLog('用户信息JSON解析失败');
      }
    }

    // 3. 调用API
    addLog('正在调用 /api/warehouse/inbound...');
    
    try {
      const response = await fetch('/api/warehouse/inbound?page=1&pageSize=10');
      addLog(`响应状态: ${response.status}`);
      
      const result = await response.json();
      addLog(`响应成功: ${result.success}`);
      addLog(`消息: ${result.message || '无'}`);
      
      if (result.success) {
        const list = result.data?.list || result.data || [];
        addLog(`数据数量: ${list.length}`);
        setData(list);
      } else {
        setError(result.message);
        addLog(`错误: ${result.message}`);
      }
    } catch (e: any) {
      addLog(`请求异常: ${e.message}`);
      setError(e.message);
    }
  };

  useEffect(() => {
    testFetch();
  }, []);

  return (
    <MainLayout title="入库数据调试">
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>调试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testFetch} className="mb-4">
              重新测试
            </Button>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">错误信息</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>数据列表 ({data.length}条)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.map((item: any, i: number) => (
                  <div key={i} className="border p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge>{item.status}</Badge>
                      <span className="font-mono">{item.order_no}</span>
                      <span>{item.supplier_name}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      数量: {item.total_quantity}, 金额: {item.total_amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
