'use client';

import { useState, useEffect } from 'react';

export default function TestAPI() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<string>('');

  useEffect(() => {
    const testAPI = async () => {
      // 直接从localStorage读取token
      const token = localStorage.getItem('token');

      if (!token) {
        setError('localStorage中没有token，请先登录');
        setLoading(false);
        return;
      }

      setTokenInfo(`Token: ${token.substring(0, 20)}...`);

      try {
        setLoading(true);
        const response = await fetch('/api/settings/system', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        console.log('API返回数据:', result);
      } catch (e: any) {
        setError(e.message);
        console.error('API错误:', e);
      } finally {
        setLoading(false);
      }
    };

    // 延迟执行，等待localStorage加载
    setTimeout(testAPI, 100);
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>加载中...</div>;
  if (error)
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ color: 'red' }}>错误</h1>
        <p>{error}</p>
        <p>
          <strong>Token信息:</strong> {tokenInfo || '无'}
        </p>
      </div>
    );

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API测试页面</h1>
      <p>
        <strong>Token状态:</strong> {tokenInfo || '无'}
      </p>

      {data?.success ? (
        <>
          <h2>分类列表 ({data.data?.categories?.length || 0}):</h2>
          <ul>
            {data.data?.categories?.map((cat: string, i: number) => {
              const count = (data.data.grouped[cat] || []).length;
              return (
                <li key={i}>
                  <strong>{cat}</strong> ({count}项)
                </li>
              );
            })}
          </ul>

          <h2>完整数据:</h2>
          <details>
            <summary>点击查看完整JSON</summary>
            <pre
              style={{
                background: '#f5f5f5',
                padding: '10px',
                overflow: 'auto',
                maxHeight: '400px',
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <div>
          <h2 style={{ color: 'red' }}>API调用失败</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
