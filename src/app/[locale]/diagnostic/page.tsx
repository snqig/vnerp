'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import ApiClient from '@/lib/api-client';

export default function DiagnosticPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const auth = useAuth();
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>({});
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginMessage, setLoginMessage] = useState('');

  const runDiagnostics = async () => {
    const info: any = {
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      user: auth.user
        ? {
            id: auth.user.id,
            username: auth.user.username,
            realName: auth.user.realName,
            roles: auth.user.roles,
          }
        : null,
      hasSuperAdminRole: auth.hasRole('super_admin'),
      localStorageToken:
        typeof window !== 'undefined' ? (localStorage.getItem('token') ? '存在' : '不存在') : 'N/A',
      sessionStorageToken:
        typeof window !== 'undefined'
          ? sessionStorage.getItem('token')
            ? '存在'
            : '不存在'
          : 'N/A',
      localStorageUser:
        typeof window !== 'undefined' ? (localStorage.getItem('user') ? '存在' : '不存在') : 'N/A',
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      try {
        const apiResult = await ApiClient.get('/api/settings/system');
        info.apiCall = {
          success: apiResult.success,
          categoriesCount: apiResult.data?.categories?.length || 0,
          categories: apiResult.data?.categories || [],
        };
      } catch (e: any) {
        info.apiCall = {
          success: false,
          error: e.message,
        };
      }
    } else {
      info.apiCall = { success: false, error: '没有token，跳过API调用' };
    }

    setDiagnosticInfo(info);
  };

  useEffect(() => {
    const timer = setTimeout(runDiagnostics, 500);
    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, auth.user]);

  const handleLogin = async () => {
    setLoginMessage('正在登录...');
    const result = await auth.login(loginUsername, loginPassword, true);
    if (result.success) {
      setLoginMessage('✅ 登录成功！请等待页面刷新...');
    } else {
      setLoginMessage(`❌ 登录失败: ${result.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 系统配置页面诊断</h1>

      {!auth.isAuthenticated && (
        <div
          style={{
            background: '#fff3e0',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <h2>🔐 请先登录</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>用户名: </label>
            <input
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              style={{ padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>密码: </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ padding: '5px' }}
            />
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            登录
          </button>
          {loginMessage && <p style={{ marginTop: '10px' }}>{loginMessage}</p>}
        </div>
      )}

      <div
        style={{
          background: '#f0f0f0',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <h2>用户状态</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>加载中:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {auth.isLoading ? '⏳ 是' : tc('no')}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>已认证:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {auth.isAuthenticated ? '✅ 是' : '❌ 否'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>超级管理员角色:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {auth.hasRole('super_admin') ? '✅ 有' : '❌ 没有'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>localStorage Token:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {diagnosticInfo.localStorageToken || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>sessionStorage Token:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {diagnosticInfo.sessionStorageToken || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>localStorage User:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {diagnosticInfo.localStorageUser || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <strong>用户信息:</strong>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {diagnosticInfo.user ? (
                  <div>
                    <div>用户名: {diagnosticInfo.user.username}</div>
                    <div>姓名: {diagnosticInfo.user.realName}</div>
                    <div>
                      角色:{' '}
                      {diagnosticInfo.user.roles?.map((r: any) => r.role_code).join(', ') || '无'}
                    </div>
                  </div>
                ) : (
                  '无'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          background: diagnosticInfo.apiCall?.success ? '#e8f5e9' : '#ffebee',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <h2>API调用结果</h2>
        {diagnosticInfo.apiCall?.success ? (
          <div>
            <p>
              <strong>✅ API调用成功</strong>
            </p>
            <p>
              <strong>分类总数: {diagnosticInfo.apiCall.categoriesCount}</strong>
            </p>
            <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#ddd' }}>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>
                    序号
                  </th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>
                    分类名称
                  </th>
                </tr>
              </thead>
              <tbody>
                {diagnosticInfo.apiCall.categories.map((cat: string, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{cat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <p>
              <strong>❌ API调用失败</strong>
            </p>
            <p>错误: {diagnosticInfo.apiCall?.error}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={runDiagnostics}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
          }}
        >
          🔄 重新诊断
        </button>
        <button
          onClick={() => (window.location.href = '/settings/basics')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          📋 返回系统设置
        </button>
      </div>
    </div>
  );
}
