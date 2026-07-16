'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  FileText,
  Scissors,
  LayoutGrid,
  Package,
  Scaling,
  Warehouse,
  RefreshCw,
  Factory,
  ShieldCheck,
  Palette,
  ChevronRight,
} from 'lucide-react';
import { ThemeSettings } from '@/components/theme-settings';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import ApiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';

interface ConfigItem {
  id?: number;
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description?: string;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
  options?: string[];
  min?: number;
  max?: number;
}

interface ConfigGroup {
  category: string;
  display_name: string;
  items: ConfigItem[];
}

interface SystemConfigResponse {
  success: boolean;
  data: {
    list: ConfigItem[];
    categories: string[];
    grouped: Record<string, ConfigItem[]>;
  };
  message?: string;
}

const configRouteMap: Record<string, { path: string; icon: React.ReactNode; description: string }> =
  {
    系统基础配置: {
      path: '/settings/config',
      icon: <Settings className="h-5 w-5" />,
      description: '系统全局配置、基础参数设置',
    },
    单据编码规则: {
      path: '/settings/config',
      icon: <FileText className="h-5 w-5" />,
      description: '各类单据编号生成规则配置',
    },
    刀模配置: {
      path: '/dcprint/die',
      icon: <Scissors className="h-5 w-5" />,
      description: '刀模模板管理、寿命设置',
    },
    网版配置: {
      path: '/dcprint/screen-plate',
      icon: <LayoutGrid className="h-5 w-5" />,
      description: '网版管理、印刷参数配置',
    },
    原材料保质期: {
      path: '/warehouse/inventory',
      icon: <Package className="h-5 w-5" />,
      description: '原材料有效期预警设置',
    },
    小料拆分标准: {
      path: '/warehouse/inventory',
      icon: <Scaling className="h-5 w-5" />,
      description: '物料拆分规格标准配置',
    },
    仓库管理规则: {
      path: '/warehouse/setup',
      icon: <Warehouse className="h-5 w-5" />,
      description: '仓库分类、库位管理规则',
    },
    盘点周期管理: {
      path: '/warehouse/stocktaking',
      icon: <RefreshCw className="h-5 w-5" />,
      description: '盘点计划、周期设置',
    },
    生产与品质规则: {
      path: '/production/workorder',
      icon: <Factory className="h-5 w-5" />,
      description: '生产流程、品质检验规则',
    },
    审批规则: {
      path: '/settings/config',
      icon: <ShieldCheck className="h-5 w-5" />,
      description: '审批流程、权限配置',
    },
  };

const mockConfigData: SystemConfigResponse = {
  success: true,
  data: {
    list: [
      {
        id: 1,
        config_name: '系统名称',
        config_key: 'system_name',
        config_value: 'Print MIS ERP',
        config_type: 'string',
        category: '系统基础配置',
        display_name: '系统名称',
        description: '系统显示名称',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 2,
        config_name: '系统版本',
        config_key: 'system_version',
        config_value: 'v0.3.1',
        config_type: 'string',
        category: '系统基础配置',
        display_name: '系统版本',
        description: '当前系统版本号',
        sort_order: 2,
        is_required: false,
        approval_required: false,
        status: 1,
      },
      {
        id: 3,
        config_name: '编码前缀',
        config_key: 'code_prefix',
        config_value: 'SO',
        config_type: 'string',
        category: '单据编码规则',
        display_name: '销售订单编码前缀',
        description: '销售订单编号前缀',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 4,
        config_name: '编码位数',
        config_key: 'code_digits',
        config_value: '4',
        config_type: 'number',
        category: '单据编码规则',
        display_name: '编码流水位数',
        description: '编号流水号位数',
        sort_order: 2,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 5,
        config_name: '刀模预警阈值',
        config_key: 'die_warning_threshold',
        config_value: '80',
        config_type: 'number',
        category: '刀模配置',
        display_name: '刀模预警阈值',
        description: '刀模使用次数达到此百分比时预警',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 6,
        config_name: '网版预警阈值',
        config_key: 'screen_warning_threshold',
        config_value: '85',
        config_type: 'number',
        category: '网版配置',
        display_name: '网版预警阈值',
        description: '网版使用次数达到此百分比时预警',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 7,
        config_name: '原材料保质期天数',
        config_key: 'material_expiry_days',
        config_value: '90',
        config_type: 'number',
        category: '原材料保质期',
        display_name: '原材料保质期天数',
        description: '原材料默认保质期天数',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 8,
        config_name: '小料拆分最小量',
        config_key: 'small_material_split_min',
        config_value: '100',
        config_type: 'number',
        category: '小料拆分标准',
        display_name: '小料拆分最小量',
        description: '小料拆分的最小数量',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 9,
        config_name: '仓库启用批次管理',
        config_key: 'warehouse_batch_enabled',
        config_value: 'true',
        config_type: 'boolean',
        category: '仓库管理规则',
        display_name: '启用批次管理',
        description: '是否启用库存批次管理',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 10,
        config_name: '盘点周期天数',
        config_key: 'stocktaking_cycle_days',
        config_value: '30',
        config_type: 'number',
        category: '盘点周期管理',
        display_name: '盘点周期天数',
        description: '定期盘点的周期天数',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 11,
        config_name: '品质检验严格模式',
        config_key: 'quality_strict_mode',
        config_value: 'true',
        config_type: 'boolean',
        category: '生产与品质规则',
        display_name: '品质检验严格模式',
        description: '是否启用严格的品质检验',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
      {
        id: 12,
        config_name: '审批流程启用',
        config_key: 'approval_enabled',
        config_value: 'true',
        config_type: 'boolean',
        category: '审批规则',
        display_name: '启用审批流程',
        description: '是否启用单据审批流程',
        sort_order: 1,
        is_required: true,
        approval_required: false,
        status: 1,
      },
    ],
    categories: [
      '系统基础配置',
      '单据编码规则',
      '刀模配置',
      '网版配置',
      '原材料保质期',
      '小料拆分标准',
      '仓库管理规则',
      '盘点周期管理',
      '生产与品质规则',
      '审批规则',
    ],
    grouped: {
      系统基础配置: [
        {
          id: 1,
          config_name: '系统名称',
          config_key: 'system_name',
          config_value: 'Print MIS ERP',
          config_type: 'string',
          category: '系统基础配置',
          display_name: '系统名称',
          description: '系统显示名称',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
        {
          id: 2,
          config_name: '系统版本',
          config_key: 'system_version',
          config_value: 'v0.3.1',
          config_type: 'string',
          category: '系统基础配置',
          display_name: '系统版本',
          description: '当前系统版本号',
          sort_order: 2,
          is_required: false,
          approval_required: false,
          status: 1,
        },
      ],
      单据编码规则: [
        {
          id: 3,
          config_name: '编码前缀',
          config_key: 'code_prefix',
          config_value: 'SO',
          config_type: 'string',
          category: '单据编码规则',
          display_name: '销售订单编码前缀',
          description: '销售订单编号前缀',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
        {
          id: 4,
          config_name: '编码位数',
          config_key: 'code_digits',
          config_value: '4',
          config_type: 'number',
          category: '单据编码规则',
          display_name: '编码流水位数',
          description: '编号流水号位数',
          sort_order: 2,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      刀模配置: [
        {
          id: 5,
          config_name: '刀模预警阈值',
          config_key: 'die_warning_threshold',
          config_value: '80',
          config_type: 'number',
          category: '刀模配置',
          display_name: '刀模预警阈值',
          description: '刀模使用次数达到此百分比时预警',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      网版配置: [
        {
          id: 6,
          config_name: '网版预警阈值',
          config_key: 'screen_warning_threshold',
          config_value: '85',
          config_type: 'number',
          category: '网版配置',
          display_name: '网版预警阈值',
          description: '网版使用次数达到此百分比时预警',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      原材料保质期: [
        {
          id: 7,
          config_name: '原材料保质期天数',
          config_key: 'material_expiry_days',
          config_value: '90',
          config_type: 'number',
          category: '原材料保质期',
          display_name: '原材料保质期天数',
          description: '原材料默认保质期天数',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      小料拆分标准: [
        {
          id: 8,
          config_name: '小料拆分最小量',
          config_key: 'small_material_split_min',
          config_value: '100',
          config_type: 'number',
          category: '小料拆分标准',
          display_name: '小料拆分最小量',
          description: '小料拆分的最小数量',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      仓库管理规则: [
        {
          id: 9,
          config_name: '仓库启用批次管理',
          config_key: 'warehouse_batch_enabled',
          config_value: 'true',
          config_type: 'boolean',
          category: '仓库管理规则',
          display_name: '启用批次管理',
          description: '是否启用库存批次管理',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      盘点周期管理: [
        {
          id: 10,
          config_name: '盘点周期天数',
          config_key: 'stocktaking_cycle_days',
          config_value: '30',
          config_type: 'number',
          category: '盘点周期管理',
          display_name: '盘点周期天数',
          description: '定期盘点的周期天数',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      生产与品质规则: [
        {
          id: 11,
          config_name: '品质检验严格模式',
          config_key: 'quality_strict_mode',
          config_value: 'true',
          config_type: 'boolean',
          category: '生产与品质规则',
          display_name: '品质检验严格模式',
          description: '是否启用严格的品质检验',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
      审批规则: [
        {
          id: 12,
          config_name: '审批流程启用',
          config_key: 'approval_enabled',
          config_value: 'true',
          config_type: 'boolean',
          category: '审批规则',
          display_name: '启用审批流程',
          description: '是否启用单据审批流程',
          sort_order: 1,
          is_required: true,
          approval_required: false,
          status: 1,
        },
      ],
    },
  },
};

export default function BasicsSettingsPage() {
  const tc = useTranslations('Common');
  const router = useRouter();

  const { hasRole, isAuthenticated } = useAuth();
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const isAdmin = isAuthenticated && hasRole('super_admin');

  const loadConfigs = useCallback(async () => {
    console.log('[Settings/Basics] 开始加载配置数据...');
    try {
      setLoading(true);

      console.log('[Settings/Basics] 调用 API: GET /api/settings/system');
      const result = await ApiClient.get<SystemConfigResponse>('/api/settings/system');

      if (result.success && result.data) {
        console.log('[Settings/Basics] API 返回成功，分类数量:', result.data.categories.length);
        console.log('[Settings/Basics] 返回的分类:', result.data.categories);
        setCategories(result.data.categories);
      } else {
        console.log('[Settings/Basics] API 返回失败，使用模拟数据');
        setCategories(mockConfigData.data.categories);
      }
    } catch (error) {
      console.error('[Settings/Basics] API 调用失败:', (error as Error).message);
      console.log('[Settings/Basics] 切换到模拟数据模式');
      setCategories(mockConfigData.data.categories);
      toast.warning('配置数据加载失败，使用本地模拟数据');
    } finally {
      setLoading(false);
      setCategories((prev) => {
        console.log('[Settings/Basics] 配置数据加载完成，当前分类:', prev);
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    console.log('[Settings/Basics] useEffect 触发，isAdmin:', isAdmin);
    if (isAdmin) {
      loadConfigs();
    } else {
      setLoading(false);
      console.log('[Settings/Basics] 非管理员，跳过配置加载');
    }
  }, [isAdmin]);

  const handleCardClick = (category: string) => {
    const routeInfo = configRouteMap[category];
    console.log('[Settings/Basics] 点击配置分类:', category);
    console.log('[Settings/Basics] 路由信息:', routeInfo);

    if (!routeInfo) {
      console.error('[Settings/Basics] 未找到路由映射:', category);
      toast.error(`未找到 "${category}" 的跳转路径`);
      return;
    }

    console.log('[Settings/Basics] 准备跳转到:', routeInfo.path);

    try {
      router.push(routeInfo.path);
      console.log('[Settings/Basics] 路由跳转成功');
    } catch (error) {
      console.error('[Settings/Basics] 路由跳转失败:', (error as Error).message);
      toast.error(`跳转失败: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return (
      <MainLayout title="系统设置">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="系统设置">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              系统配置导航
            </CardTitle>
            <CardDescription>点击以下分类进入对应功能模块进行配置</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const routeInfo = configRouteMap[category];
                if (!routeInfo) {
                  console.warn('[Settings/Basics] 未配置路由映射:', category);
                  return null;
                }
                return (
                  <button
                    key={category}
                    onClick={() => handleCardClick(category)}
                    className="group flex items-center p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer w-full text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {routeInfo.icon}
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="font-medium text-gray-900">{category}</h4>
                      <p className="text-sm text-gray-500">{routeInfo.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              主题设置
            </CardTitle>
            <CardDescription>{tc('text_kxopjs')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSettings />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
