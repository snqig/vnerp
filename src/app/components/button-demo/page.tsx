'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  Edit,
  Search,
  Download,
  Upload,
  RefreshCw,
  Settings,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, PrimaryButton, SecondaryButton, OutlineButton, DestructiveButton, SuccessButton, WarningButton, InfoButton, GhostButton, LinkButton } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function ButtonDemoPage() {
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('default');
  const [selectedSize, setSelectedSize] = useState('default');
  const [selectedShape, setSelectedShape] = useState('default');
  const [fullWidth, setFullWidth] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-200">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">按钮组件演示</h1>
                  <p className="text-slate-500">展示所有按钮变体和功能</p>
                </div>
              </div>
            </motion.div>

            {/* 交互式演示 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>交互式按钮演示</CardTitle>
                  <CardDescription>调整参数查看按钮效果</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variant">变体</Label>
                      <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                        <SelectTrigger id="variant">
                          <SelectValue placeholder="选择变体" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="secondary">次要</SelectItem>
                          <SelectItem value="outline">轮廓</SelectItem>
                          <SelectItem value="destructive">危险</SelectItem>
                          <SelectItem value="success">成功</SelectItem>
                          <SelectItem value="warning">警告</SelectItem>
                          <SelectItem value="info">信息</SelectItem>
                          <SelectItem value="ghost">幽灵</SelectItem>
                          <SelectItem value="link">链接</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size">尺寸</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger id="size">
                          <SelectValue placeholder="选择尺寸" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xs">超小</SelectItem>
                          <SelectItem value="sm">小</SelectItem>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="lg">大</SelectItem>
                          <SelectItem value="xl">超大</SelectItem>
                          <SelectItem value="icon">图标</SelectItem>
                          <SelectItem value="icon-sm">小图标</SelectItem>
                          <SelectItem value="icon-lg">大图标</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shape">形状</Label>
                      <Select value={selectedShape} onValueChange={setSelectedShape}>
                        <SelectTrigger id="shape">
                          <SelectValue placeholder="选择形状" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">默认</SelectItem>
                          <SelectItem value="pill">胶囊</SelectItem>
                          <SelectItem value="square">方形</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>选项</Label>
                      <div className="flex items-center space-x-4 pt-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={fullWidth}
                            onChange={(e) => setFullWidth(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">全宽</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={disabled}
                            onChange={(e) => setDisabled(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">禁用</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <Button
                        variant={selectedVariant as any}
                        size={selectedSize as any}
                        shape={selectedShape as any}
                        fullWidth={fullWidth}
                        disabled={disabled}
                      >
                        按钮文本
                      </Button>
                      <Button
                        variant={selectedVariant as any}
                        size={selectedSize as any}
                        shape={selectedShape as any}
                        fullWidth={fullWidth}
                        disabled={disabled}
                      >
                        <Plus className="w-4 h-4" />
                        带图标
                      </Button>
                      <Button
                        variant={selectedVariant as any}
                        size={selectedSize as any === 'icon' ? 'icon' : 'default'}
                        shape={selectedShape as any}
                        fullWidth={fullWidth}
                        disabled={disabled}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        variant={selectedVariant as any}
                        size={selectedSize as any}
                        shape={selectedShape as any}
                        fullWidth={fullWidth}
                        disabled={disabled}
                        loading
                      >
                        加载中
                      </Button>
                      <Button
                        variant={selectedVariant as any}
                        size={selectedSize as any}
                        shape={selectedShape as any}
                        fullWidth={fullWidth}
                        disabled={disabled}
                        onClick={handleLoading}
                        loading={loading}
                      >
                        点击加载
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 按钮变体 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>按钮变体</CardTitle>
                  <CardDescription>不同风格的按钮</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="default">
                    <TabsList className="mb-4">
                      <TabsTrigger value="default">默认风格</TabsTrigger>
                      <TabsTrigger value="colored">彩色风格</TabsTrigger>
                      <TabsTrigger value="special">特殊风格</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="default" className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <PrimaryButton>
                          主要按钮
                        </PrimaryButton>
                        <SecondaryButton>
                          次要按钮
                        </SecondaryButton>
                        <OutlineButton>
                          轮廓按钮
                        </OutlineButton>
                        <GhostButton>
                          幽灵按钮
                        </GhostButton>
                        <LinkButton>
                          链接按钮
                        </LinkButton>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <PrimaryButton disabled>
                          禁用状态
                        </PrimaryButton>
                        <SecondaryButton disabled>
                          禁用状态
                        </SecondaryButton>
                        <OutlineButton disabled>
                          禁用状态
                        </OutlineButton>
                        <GhostButton disabled>
                          禁用状态
                        </GhostButton>
                        <LinkButton disabled>
                          禁用状态
                        </LinkButton>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="colored" className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <SuccessButton>
                          <CheckCircle2 className="w-4 h-4" />
                          成功按钮
                        </SuccessButton>
                        <WarningButton>
                          <AlertCircle className="w-4 h-4" />
                          警告按钮
                        </WarningButton>
                        <InfoButton>
                          <Info className="w-4 h-4" />
                          信息按钮
                        </InfoButton>
                        <DestructiveButton>
                          <Trash2 className="w-4 h-4" />
                          危险按钮
                        </DestructiveButton>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <SuccessButton disabled>
                          <CheckCircle2 className="w-4 h-4" />
                          禁用状态
                        </SuccessButton>
                        <WarningButton disabled>
                          <AlertCircle className="w-4 h-4" />
                          禁用状态
                        </WarningButton>
                        <InfoButton disabled>
                          <Info className="w-4 h-4" />
                          禁用状态
                        </InfoButton>
                        <DestructiveButton disabled>
                          <Trash2 className="w-4 h-4" />
                          禁用状态
                        </DestructiveButton>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="special" className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <PrimaryButton shape="pill">
                          胶囊按钮
                        </PrimaryButton>
                        <SecondaryButton shape="square">
                          方形按钮
                        </SecondaryButton>
                        <OutlineButton shape="pill">
                          胶囊轮廓
                        </OutlineButton>
                        <DestructiveButton shape="square">
                          方形危险
                        </DestructiveButton>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <PrimaryButton fullWidth>
                          全宽按钮
                        </PrimaryButton>
                        <SecondaryButton fullWidth>
                          全宽次要
                        </SecondaryButton>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>

            {/* 按钮尺寸 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>按钮尺寸</CardTitle>
                  <CardDescription>不同大小的按钮</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <PrimaryButton size="xs">
                      超小按钮
                    </PrimaryButton>
                    <PrimaryButton size="sm">
                      小按钮
                    </PrimaryButton>
                    <PrimaryButton size="default">
                      默认按钮
                    </PrimaryButton>
                    <PrimaryButton size="lg">
                      大按钮
                    </PrimaryButton>
                    <PrimaryButton size="xl">
                      超大按钮
                    </PrimaryButton>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <PrimaryButton size="icon-sm">
                      <Plus className="w-4 h-4" />
                    </PrimaryButton>
                    <PrimaryButton size="icon">
                      <Plus className="w-4 h-4" />
                    </PrimaryButton>
                    <PrimaryButton size="icon-lg">
                      <Plus className="w-4 h-4" />
                    </PrimaryButton>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 按钮使用场景 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>使用场景</CardTitle>
                  <CardDescription>常见的按钮使用场景</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 表单操作 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">表单操作</h3>
                    <div className="flex flex-wrap gap-4">
                      <SuccessButton>
                        <CheckCircle2 className="w-4 h-4" />
                        提交
                      </SuccessButton>
                      <OutlineButton>
                        <RefreshCw className="w-4 h-4" />
                        重置
                      </OutlineButton>
                      <LinkButton>
                        取消
                      </LinkButton>
                    </div>
                  </div>
                  
                  {/* 表格操作 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">表格操作</h3>
                    <div className="flex flex-wrap gap-4">
                      <PrimaryButton>
                        <Plus className="w-4 h-4" />
                        新增
                      </PrimaryButton>
                      <SecondaryButton>
                        <Edit className="w-4 h-4" />
                        编辑
                      </SecondaryButton>
                      <DestructiveButton>
                        <Trash2 className="w-4 h-4" />
                        删除
                      </DestructiveButton>
                      <OutlineButton>
                        <Search className="w-4 h-4" />
                        搜索
                      </OutlineButton>
                    </div>
                  </div>
                  
                  {/* 上传下载 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">上传下载</h3>
                    <div className="flex flex-wrap gap-4">
                      <OutlineButton>
                        <Upload className="w-4 h-4" />
                        上传
                      </OutlineButton>
                      <OutlineButton>
                        <Download className="w-4 h-4" />
                        下载
                      </OutlineButton>
                    </div>
                  </div>
                  
                  {/* 用户操作 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">用户操作</h3>
                    <div className="flex flex-wrap gap-4">
                      <PrimaryButton>
                        <User className="w-4 h-4" />
                        登录
                      </PrimaryButton>
                      <DestructiveButton>
                        <LogOut className="w-4 h-4" />
                        退出
                      </DestructiveButton>
                      <OutlineButton>
                        <Settings className="w-4 h-4" />
                        设置
                      </OutlineButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 代码示例 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>代码示例</CardTitle>
                  <CardDescription>如何使用按钮组件</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">基本使用</h3>
                    <pre className="bg-slate-100 p-4 rounded-md text-sm overflow-x-auto">
                      {`<Button>
  按钮文本
</Button>

<Button variant="outline">
  轮廓按钮
</Button>

<Button size="sm">
  小按钮
</Button>`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">带图标的按钮</h3>
                    <pre className="bg-slate-100 p-4 rounded-md text-sm overflow-x-auto">
                      {`<Button>
  <Plus className="w-4 h-4" />
  新增
</Button>

<Button size="icon">
  <Search className="w-4 h-4" />
</Button>`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">加载状态</h3>
                    <pre className="bg-slate-100 p-4 rounded-md text-sm overflow-x-auto">
                      {`<Button loading>
  加载中
</Button>

<Button loading={isLoading} onClick={handleLoading}>
  点击加载
</Button>`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">便捷组件</h3>
                    <pre className="bg-slate-100 p-4 rounded-md text-sm overflow-x-auto">
                      {`<PrimaryButton>主要按钮</PrimaryButton>
<SecondaryButton>次要按钮</SecondaryButton>
<SuccessButton>成功按钮</SuccessButton>
<WarningButton>警告按钮</WarningButton>
<InfoButton>信息按钮</InfoButton>
<DestructiveButton>危险按钮</DestructiveButton>`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
