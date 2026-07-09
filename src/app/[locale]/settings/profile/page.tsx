'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Camera, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const t = useTranslations('System');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [userInfo, setUserInfo] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    realName: '',
    phone: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserInfo(user);
        setProfileForm({
          realName: user.realName || '',
          phone: user.phone || '',
          email: user.email || '',
        });
      } catch {}
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profileForm.realName) {
      toast({ title: '姓名不能为空', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/system/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '保存成功' });
        // 更新本地存储
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (stored) {
          const user = JSON.parse(stored);
          const updated = { ...user, ...profileForm };
          const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(updated));
          setUserInfo(updated);
        }
      } else {
        toast({ title: result.message || '保存失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast({ title: '请填写完整密码信息', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: '两次密码输入不一致', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: '密码长度不能少于6位', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/system/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '密码修改成功，请重新登录' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast({ title: result.message || '密码修改失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '密码修改失败', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">
          {t('user')}
          {tc('text_vzg8bd')}
        </h1>

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* 左侧用户信息卡 */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userInfo?.avatar} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(userInfo?.realName || '')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full p-0"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-center">
                <p className="font-medium">{userInfo?.realName || '-'}</p>
                <p className="text-sm text-muted-foreground">@{userInfo?.username || '-'}</p>
              </div>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('email')}</span>
                  <span>{userInfo?.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('phone')}</span>
                  <span>{userInfo?.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('roleName')}</span>
                  <span>{userInfo?.roles?.[0]?.role_name || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右侧编辑区 */}
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-1" />
                {tc('text_biyzkw')}
              </TabsTrigger>
              <TabsTrigger value="password">
                <Lock className="h-4 w-4 mr-1" />
                {tc('text_ai7i2u')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>{tc('text_biyzkw')}</CardTitle>
                  <CardDescription>{tc('text_n6hg2x')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>{t('realName')}</Label>
                    <Input
                      value={profileForm.realName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, realName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('phone')}</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('email')}</Label>
                    <Input
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? '保存中...' : tc('save')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>{tc('changePassword')}</CardTitle>
                  <CardDescription>{tc('text_f6ikpe')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>{tc('text_cdc5hx')}</Label>
                    <Input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, oldPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{tc('text_fcgq3')}</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                      }
                      placeholder="至少6位字符"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{tc('text_8aswln')}</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={saving}>
                    <Lock className="h-4 w-4 mr-1" />
                    {saving ? '修改中...' : '确认修改'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
