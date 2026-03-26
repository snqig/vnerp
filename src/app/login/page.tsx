'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Lock, Eye, EyeOff, Shield, Database, Globe, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 登录表单状态
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  // 注册表单状态
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    real_name: '',
    email: '',
    phone: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });

      const result = await response.json();

      if (result.success) {
        const storage = loginForm.rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', result.data.token);
        storage.setItem('user', JSON.stringify(result.data.user));
        toast.success('登录成功');
        router.push('/');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!registerForm.username || !registerForm.password) {
      setError('用户名和密码不能为空');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(registerForm.username)) {
      setError('用户名只能包含字母、数字和下划线，长度4-20位');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          real_name: registerForm.real_name,
          email: registerForm.email,
          phone: registerForm.phone
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('注册成功，请登录');
        setActiveTab('login');
        setLoginForm({ ...loginForm, username: registerForm.username });
        setRegisterForm({
          username: '',
          password: '',
          confirmPassword: '',
          real_name: '',
          email: '',
          phone: ''
        });
      } else {
        setError(data.message || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-white relative z-10">
        <div className="w-24 h-24 mb-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
          <Shield className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          达昌ERP
        </h1>
        <p className="text-xl text-gray-300 mb-8">丝网印刷管理系统</p>
        <div className="grid grid-cols-2 gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span>数据管理</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-400" />
            <span>云端同步</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>高效生产</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>安全可靠</span>
          </div>
        </div>
      </div>

      {/* 中间竖线分隔 */}
      <div className="hidden lg:block w-px self-stretch bg-gradient-to-b from-transparent via-gray-400 to-transparent relative z-10" />

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <Card className="w-full max-w-md bg-transparent backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden mx-auto w-16 h-16 mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">欢迎回来</CardTitle>
            <CardDescription className="text-gray-200">
              登录您的达昌ERP账户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && activeTab === 'login' && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white">
                      <User className="w-4 h-4 inline mr-2" />
                      用户名
                    </Label>
                    <Input
                      id="username"
                      placeholder="请输入用户名"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      <Lock className="w-4 h-4 inline mr-2" />
                      密码
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="bg-white border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={loginForm.rememberMe}
                        onCheckedChange={(checked) => setLoginForm({ ...loginForm, rememberMe: checked as boolean })}
                      />
                      <Label htmlFor="remember" className="text-sm text-white cursor-pointer">
                        记住我
                      </Label>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    disabled={loading}
                    onClick={(e) => {
                      console.log('登录按钮被点击');
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && activeTab === 'register' && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-white">用户名</Label>
                    <Input
                      id="reg-username"
                      placeholder="4-20位字母数字下划线"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-realname" className="text-white">真实姓名</Label>
                    <Input
                      id="reg-realname"
                      placeholder="请输入真实姓名"
                      value={registerForm.real_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, real_name: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-white">密码</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6位"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="bg-white border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-white">确认密码</Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        className="bg-white border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      '注册'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
