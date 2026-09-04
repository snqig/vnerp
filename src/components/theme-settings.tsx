'use client';
import { useTranslations } from 'next-intl';

import { useSnowAdminTheme, NavigationMode } from '@/hooks/useSnowAdminTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Menu,
  PanelTop,
  Blend,
  Moon,
  Eye,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navModes: { value: NavigationMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'sidebar',
    label: '侧边栏',
    icon: <Menu className="w-4 h-4" />,
    desc: '经典左侧菜单导航',
  },
  { value: 'top', label: '顶部', icon: <PanelTop className="w-4 h-4" />, desc: '顶部水平菜单导航' },
  {
    value: 'mixed',
    label: '混合',
    icon: <Blend className="w-4 h-4" />,
    desc: '顶部+侧边栏混合导航',
  },
];

export function ThemeSettings() {
  const ts = useTranslations('Common');
  const {
    navigationMode,
    sidebarDark,
    colorWeak,
    grayMode,
    setNavigationMode,
    setSidebarDark,
    setColorWeak,
    setGrayMode,
    resetTheme,
  } = useSnowAdminTheme();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">{ts('k_hkn47m')}</CardTitle>
        </div>
        <CardDescription>{ts('k_8jfsmx')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            {ts('k_f589uz')}</Label>
          <div className="grid grid-cols-3 gap-3">
            {navModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setNavigationMode(mode.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition hover:shadow-md',
                  navigationMode === mode.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-8 rounded border flex items-center justify-center',
                    navigationMode === mode.value
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted border-border'
                  )}
                >
                  {mode.icon}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    navigationMode === mode.value ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {mode.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="text-sm font-medium">{ts('k_11c3ld4')}</Label>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm">{ts('k_1obdid')}</div>
                <div className="text-xs text-muted-foreground">{ts('k_cxyb1n')}</div>
              </div>
            </div>
            <Switch checked={sidebarDark} onCheckedChange={setSidebarDark} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm">{ts('k_1w0q5k')}</div>
                <div className="text-xs text-muted-foreground">{ts('k_4u7snr')}</div>
              </div>
            </div>
            <Switch checked={colorWeak} onCheckedChange={setColorWeak} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm">{ts('k_ygb1zb')}</div>
                <div className="text-xs text-muted-foreground">{ts('k_1g1ry3c')}</div>
              </div>
            </div>
            <Switch checked={grayMode} onCheckedChange={setGrayMode} />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={resetTheme}>
            <RotateCcw className="w-3 h-3 mr-1" />
            {ts('k_6fve4s')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
