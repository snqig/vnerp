'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Printer,
  ArrowLeft,
  Sparkles,
  FileText,
  Palette,
  Settings,
  Package,
  CheckCircle2,
  Building2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { useStandardCardForm } from '@/hooks/useStandardCardForm';

// 现代化录入表单组件（不含 MainLayout/Suspense 包装，由父页面统一提供）
export function InputV2Form() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [showMoreFields, setShowMoreFields] = useState(false);

  const {
    data,
    loading: _loading,
    saving,
    error: _error,
    savedCardId,
    customerSearch: _customerSearch,
    setCustomerSearch,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers,
    isEditMode,
    editId,
    updateField,
    updateSequence,
    handleToggleMultiValue: _handleToggleMultiValue,
    handleSelectCustomer,
    handleSave,
    handleSaveAndPreview,
  } = useStandardCardForm({ mode: 'v2' });

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              {isEditMode ? '编辑标准卡' : '新建标准卡（现代化录入）'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? `编辑标准卡 ID: ${editId}` : '使用分步式界面录入标准卡信息'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {savedCardId && (
            <Badge variant="secondary" className="mr-2">
              已保存 ID: {savedCardId}
            </Badge>
          )}
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? (isEditMode ? '更新中...' : '保存中...') : isEditMode ? '更新' : '保存'}
          </Button>
          <Button onClick={handleSaveAndPreview} disabled={saving}>
            <Printer className="h-4 w-4 mr-2" />
            {saving
              ? isEditMode
                ? '更新中...'
                : '保存中...'
              : isEditMode
                ? '更新并预览'
                : '保存并预览'}
          </Button>
        </div>
      </div>

      {/* 进度指示器 */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'basic', label: '基本信息', icon: FileText },
          { id: 'material', label: '材料规格', icon: Package },
          { id: 'print', label: '印刷信息', icon: Palette },
          { id: 'process', label: '工艺流程', icon: Settings },
        ].map((step, index) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          const isCompleted =
            ['basic', 'material', 'print'].indexOf(activeTab) >
            ['basic', 'material', 'print'].indexOf(step.id);
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveTab(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {step.label}
              </button>
              {index < 3 && <div className="w-8 h-px bg-gray-300 mx-2" />}
            </div>
          );
        })}
      </div>

      {/* 表单内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* 基本信息 */}
        <TabsContent value="basic" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>标准卡编号</Label>
                  <Input
                    value={data.cardNo}
                    onChange={(e) => updateField('cardNo', e.target.value)}
                    placeholder="自动生成或手动输入"
                  />
                </div>
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={data.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>版本</Label>
                  <Input
                    value={data.version}
                    onChange={(e) => updateField('version', e.target.value)}
                    placeholder="如：A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>文件编号</Label>
                  <Input
                    value={data.documentCode}
                    onChange={(e) => updateField('documentCode', e.target.value)}
                    placeholder="如：DOC-001"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      客户信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 relative customer-dropdown-container">
                      <Label>客户名称</Label>
                      <div className="relative">
                        <Input
                          value={data.customer}
                          onChange={(e) => {
                            updateField('customer', e.target.value);
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          placeholder="输入或选择客户名称"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {/* 客户下拉列表 */}
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="px-4 py-2 hover:bg-accent/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              <div className="font-medium">{customer.customerName}</div>
                              <div className="text-xs text-muted-foreground">
                                编码: {customer.customerCode} | 联系人:{' '}
                                {customer.contactName || '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>客户代码</Label>
                      <Input
                        value={data.customerCode}
                        onChange={(e) => updateField('customerCode', e.target.value)}
                        placeholder="选择客户后自动填充"
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      产品信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>产品名称</Label>
                      <Input
                        value={data.productName}
                        onChange={(e) => updateField('productName', e.target.value)}
                        placeholder="输入产品名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>成品尺寸</Label>
                      <Input
                        value={data.finishedSize}
                        onChange={(e) => updateField('finishedSize', e.target.value)}
                        placeholder="如：100×150mm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>公差</Label>
                      <Input
                        value={data.tolerance}
                        onChange={(e) => updateField('tolerance', e.target.value)}
                        placeholder="如：±0.1mm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab('material')}>下一步：材料规格</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 材料规格 */}
        <TabsContent value="material" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                材料规格
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>材料名称</Label>
                  <Input
                    value={data.materialName}
                    onChange={(e) => updateField('materialName', e.target.value)}
                    placeholder="输入材料名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>材料类型</Label>
                  <Select
                    value={data.materialType}
                    onValueChange={(value) => updateField('materialType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择材料类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="硬胶">硬胶</SelectItem>
                      <SelectItem value="软胶">软胶</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>排版方式</Label>
                  <Input
                    value={data.layoutType}
                    onChange={(e) => updateField('layoutType', e.target.value)}
                    placeholder="输入排版方式"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>片材规格</Label>
                  <div className="flex gap-2">
                    <Input
                      value={data.sheetSpecs.width}
                      onChange={(e) =>
                        updateField('sheetSpecs', {
                          ...data.sheetSpecs,
                          width: e.target.value,
                        })
                      }
                      placeholder="宽(mm)"
                    />
                    <span className="flex items-center">×</span>
                    <Input
                      value={data.sheetSpecs.length}
                      onChange={(e) =>
                        updateField('sheetSpecs', {
                          ...data.sheetSpecs,
                          length: e.target.value,
                        })
                      }
                      placeholder="长(mm)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>芯型</Label>
                  <div className="flex gap-2">
                    {['3#', '2#', '1#'].map((num) => (
                      <Input
                        key={num}
                        value={data.coreType?.includes(num) ? num : ''}
                        onChange={(e) => {
                          const currentTypes = data.coreType?.split(',').filter(Boolean) || [];
                          let newTypes;
                          if (e.target.value) {
                            if (!currentTypes.includes(num)) {
                              newTypes = [...currentTypes, num];
                            } else {
                              newTypes = currentTypes;
                            }
                          } else {
                            newTypes = currentTypes.filter((t) => t !== num);
                          }
                          updateField('coreType', newTypes.join(','));
                        }}
                        placeholder={num}
                        className="text-center"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>纸向</Label>
                  <Input
                    value={data.paperDirection}
                    onChange={(e) => updateField('paperDirection', e.target.value)}
                    placeholder="输入纸向"
                  />
                </div>
                <div className="space-y-2">
                  <Label>料宽</Label>
                  <Input
                    value={data.rollWidth}
                    onChange={(e) => updateField('rollWidth', e.target.value)}
                    placeholder="输入料宽"
                  />
                </div>
                <div className="space-y-2">
                  <Label>纸边</Label>
                  <Input
                    value={data.paperEdge}
                    onChange={(e) => updateField('paperEdge', e.target.value)}
                    placeholder="输入纸边"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('basic')}>
                  上一步
                </Button>
                <Button onClick={() => setActiveTab('print')}>下一步：印刷信息</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 印刷信息 */}
        <TabsContent value="print" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                印刷信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>印刷类型</Label>
                  <Select
                    value={data.printType?.split(',')[0] || ''}
                    onValueChange={(value) => updateField('printType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择印刷类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="胶印">胶印</SelectItem>
                      <SelectItem value="卷料丝印">卷料丝印</SelectItem>
                      <SelectItem value="片料丝印">片料丝印</SelectItem>
                      <SelectItem value="轮转印">轮转印</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>首跳距</Label>
                  <Input
                    value={data.firstJumpDistance}
                    onChange={(e) => updateField('firstJumpDistance', e.target.value)}
                    placeholder="输入首跳距"
                  />
                </div>
                <div className="space-y-2">
                  <Label>标准用量</Label>
                  <Input
                    value={data.standardUsage}
                    onChange={(e) => updateField('standardUsage', e.target.value)}
                    placeholder="输入标准用量"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-3 block">印序信息</Label>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-4 space-y-3">
                    {data.sequences.map((seq, index) => (
                      <Card key={seq.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary">序{index + 1}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Input
                              placeholder="颜色"
                              value={seq.color}
                              onChange={(e) => updateSequence(index, 'color', e.target.value)}
                            />
                            <Input
                              placeholder="油墨编号"
                              value={seq.inkCode}
                              onChange={(e) => updateSequence(index, 'inkCode', e.target.value)}
                            />
                            <Input
                              placeholder="网版编号"
                              value={seq.plateCode}
                              onChange={(e) => updateSequence(index, 'plateCode', e.target.value)}
                            />
                            <Input
                              placeholder="网目"
                              value={seq.mesh}
                              onChange={(e) => updateSequence(index, 'mesh', e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                            <Input
                              placeholder="菲林编号"
                              value={seq.linCode}
                              onChange={(e) => updateSequence(index, 'linCode', e.target.value)}
                            />
                            <Input
                              placeholder="存放位置"
                              value={seq.storageLocation}
                              onChange={(e) =>
                                updateSequence(index, 'storageLocation', e.target.value)
                              }
                            />
                            <Input
                              placeholder="印版存放"
                              value={seq.plateStorage}
                              onChange={(e) =>
                                updateSequence(index, 'plateStorage', e.target.value)
                              }
                            />
                            <Input
                              placeholder="印面"
                              value={seq.printSide}
                              onChange={(e) => updateSequence(index, 'printSide', e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('material')}>
                  上一步
                </Button>
                <Button onClick={() => setActiveTab('process')}>下一步：工艺流程</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 工艺流程 */}
        <TabsContent value="process" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                工艺流程
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工艺流程1</Label>
                  <Input
                    value={data.processFlow1}
                    onChange={(e) => updateField('processFlow1', e.target.value)}
                    placeholder="输入工艺流程1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>工艺流程2</Label>
                  <Input
                    value={data.processFlow2}
                    onChange={(e) => updateField('processFlow2', e.target.value)}
                    placeholder="输入工艺流程2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>加工方式</Label>
                  <Select
                    value={data.processMethod?.split(',')[0] || ''}
                    onValueChange={(value) => updateField('processMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择加工方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="模切">模切</SelectItem>
                      <SelectItem value="冲压">冲压</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>模具编号</Label>
                  <Input
                    value={data.moldCode}
                    onChange={(e) => updateField('moldCode', e.target.value)}
                    placeholder="输入模具编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>滴胶类型</Label>
                  <Select
                    value={data.glueType}
                    onValueChange={(value) => updateField('glueType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择滴胶类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="硬胶">硬胶</SelectItem>
                      <SelectItem value="软胶">软胶</SelectItem>
                      <SelectItem value="PU胶">PU胶</SelectItem>
                      <SelectItem value="其它胶">其它胶</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>包装类型</Label>
                  <Select
                    value={data.packingType}
                    onValueChange={(value) => updateField('packingType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择包装类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="包装">包装</SelectItem>
                      <SelectItem value="PCS/卷">PCS/卷</SelectItem>
                      <SelectItem value="PCS/扎">PCS/扎</SelectItem>
                      <SelectItem value="PCS/袋">PCS/袋</SelectItem>
                      <SelectItem value="PCS/箱">PCS/箱</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>每排片数</Label>
                  <Input
                    value={data.slicePerRow}
                    onChange={(e) => updateField('slicePerRow', e.target.value)}
                    placeholder="输入每排片数"
                  />
                </div>
                <div className="space-y-2">
                  <Label>每卷片数</Label>
                  <Input
                    value={data.slicePerRoll}
                    onChange={(e) => updateField('slicePerRoll', e.target.value)}
                    placeholder="输入每卷片数"
                  />
                </div>
                <div className="space-y-2">
                  <Label>每袋片数</Label>
                  <Input
                    value={data.slicePerBag}
                    onChange={(e) => updateField('slicePerBag', e.target.value)}
                    placeholder="输入每袋片数"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>每箱片数</Label>
                  <Input
                    value={data.slicePerBox}
                    onChange={(e) => updateField('slicePerBox', e.target.value)}
                    placeholder="输入每箱片数"
                  />
                </div>
                <div className="space-y-2">
                  <Label>每扎片数</Label>
                  <Input
                    value={data.slicePerBundle}
                    onChange={(e) => updateField('slicePerBundle', e.target.value)}
                    placeholder="输入每扎片数"
                  />
                </div>
                <div className="space-y-2">
                  <Label>包装数量</Label>
                  <Input
                    value={data.packingQty}
                    onChange={(e) => updateField('packingQty', e.target.value)}
                    placeholder="输入包装数量"
                  />
                </div>
              </div>

              {/* 更多字段（可折叠，保障全字段提交） */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowMoreFields(!showMoreFields)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    更多字段（非高频，提交时自动包含）
                  </span>
                  {showMoreFields ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showMoreFields && (
                  <div className="p-4 border-t space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>间距</Label>
                        <Input
                          value={data.spacing}
                          onChange={(e) => updateField('spacing', e.target.value)}
                          placeholder="间距"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>间距值</Label>
                        <Input
                          value={data.spacingValue}
                          onChange={(e) => updateField('spacingValue', e.target.value)}
                          placeholder="间距值"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>跳距</Label>
                        <Input
                          value={data.jumpDistance}
                          onChange={(e) => updateField('jumpDistance', e.target.value)}
                          placeholder="跳距"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>跳距2</Label>
                        <Input
                          value={data.jumpDistance2}
                          onChange={(e) => updateField('jumpDistance2', e.target.value)}
                          placeholder="跳距2"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>冲压方法</Label>
                        <Input
                          value={data.stampingMethod}
                          onChange={(e) => updateField('stampingMethod', e.target.value)}
                          placeholder="冲压方法"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>排模方法</Label>
                        <Input
                          value={data.layoutMethod}
                          onChange={(e) => updateField('layoutMethod', e.target.value)}
                          placeholder="排模方法"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>菲林厂商</Label>
                        <Input
                          value={data.filmManufacturer}
                          onChange={(e) => updateField('filmManufacturer', e.target.value)}
                          placeholder="菲林厂商"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>菲林编号</Label>
                        <Input
                          value={data.filmCode}
                          onChange={(e) => updateField('filmCode', e.target.value)}
                          placeholder="菲林编号"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>背胶类型</Label>
                        <Input
                          value={data.adhesiveType}
                          onChange={(e) => updateField('adhesiveType', e.target.value)}
                          placeholder="背胶类型"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>背胶厂商</Label>
                        <Input
                          value={data.adhesiveManufacturer}
                          onChange={(e) => updateField('adhesiveManufacturer', e.target.value)}
                          placeholder="背胶厂商"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>背胶编号</Label>
                        <Input
                          value={data.adhesiveCode}
                          onChange={(e) => updateField('adhesiveCode', e.target.value)}
                          placeholder="背胶编号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>虚线刀</Label>
                        <Select
                          value={data.dashedKnife ? 'true' : 'false'}
                          onValueChange={(v) => updateField('dashedKnife', v === 'true')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="是否加虚线刀" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">否</SelectItem>
                            <SelectItem value="true">是</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>MYLAR材料</Label>
                        <Input
                          value={data.mylarMaterial}
                          onChange={(e) => updateField('mylarMaterial', e.target.value)}
                          placeholder="MYLAR材料"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>MYLAR规格</Label>
                        <Input
                          value={data.mylarSpecs}
                          onChange={(e) => updateField('mylarSpecs', e.target.value)}
                          placeholder="MYLAR规格"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>离型纸种类</Label>
                        <Input
                          value={data.releasePaperType}
                          onChange={(e) => updateField('releasePaperType', e.target.value)}
                          placeholder="离型纸种类"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>离型纸规格</Label>
                        <Input
                          value={data.releasePaperSpecs}
                          onChange={(e) => updateField('releasePaperSpecs', e.target.value)}
                          placeholder="离型纸规格"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>背刀模具</Label>
                        <Input
                          value={data.backKnifeMold}
                          onChange={(e) => updateField('backKnifeMold', e.target.value)}
                          placeholder="背刀模具"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>腐蚀刀模</Label>
                        <Input
                          value={data.etchMold}
                          onChange={(e) => updateField('etchMold', e.target.value)}
                          placeholder="腐蚀刀模"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>垫纸材料</Label>
                        <Input
                          value={data.paddingMaterial}
                          onChange={(e) => updateField('paddingMaterial', e.target.value)}
                          placeholder="垫纸材料"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>打包材料</Label>
                        <Input
                          value={data.packingMaterial}
                          onChange={(e) => updateField('packingMaterial', e.target.value)}
                          placeholder="打包材料"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>专色信息</Label>
                        <Input
                          value={data.specialColor}
                          onChange={(e) => updateField('specialColor', e.target.value)}
                          placeholder="专色信息"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>专色配比</Label>
                        <Input
                          value={data.colorFormula}
                          onChange={(e) => updateField('colorFormula', e.target.value)}
                          placeholder="专色配比"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>图档路径</Label>
                        <Input
                          value={data.filePath}
                          onChange={(e) => updateField('filePath', e.target.value)}
                          placeholder="图档路径"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>制表</Label>
                        <Input
                          value={data.creator}
                          onChange={(e) => updateField('creator', e.target.value)}
                          placeholder="制表"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>审核</Label>
                        <Input
                          value={data.reviewer}
                          onChange={(e) => updateField('reviewer', e.target.value)}
                          placeholder="审核"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>厂务</Label>
                        <Input
                          value={data.factoryManager}
                          onChange={(e) => updateField('factoryManager', e.target.value)}
                          placeholder="厂务"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>品管</Label>
                        <Input
                          value={data.qualityManager}
                          onChange={(e) => updateField('qualityManager', e.target.value)}
                          placeholder="品管"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>业务</Label>
                        <Input
                          value={data.sales}
                          onChange={(e) => updateField('sales', e.target.value)}
                          placeholder="业务"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>核准</Label>
                        <Input
                          value={data.approver}
                          onChange={(e) => updateField('approver', e.target.value)}
                          placeholder="核准"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>样品信息</Label>
                        <Input
                          value={data.sampleInfo}
                          onChange={(e) => updateField('sampleInfo', e.target.value)}
                          placeholder="样品信息"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Input
                  value={data.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="输入备注信息"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('print')}>
                  上一步
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                  <Button onClick={handleSaveAndPreview}>
                    <Printer className="h-4 w-4 mr-2" />
                    保存并预览
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
