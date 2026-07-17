'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Database,
  ChevronDown,
  ChevronRight,
  Link2,
  Layers,
  ShoppingCart,
  Scissors,
  Factory,
  Cog,
  QrCode,
  Send,
  ClipboardCheck,
  PackageCheck,
  ShieldCheck,
  Monitor,
  Server,
  HardDrive,
  Cpu,
  Globe,
  Lock,
  Shield,
  CheckSquare,
  Workflow,
  Box,
  BarChart3,
  Wrench,
  Users,
  Truck,
  FileText,
  Tag,
  Warehouse,
  FlaskConical,
  CreditCard,
  UserCog,
  LayoutGrid,
} from 'lucide-react';

const flowNodes = [
  {
    step: 1,
    nameKey: 'procurementInbound',
    icon: ShoppingCart,
    tables: ['pur_request', 'pur_order', 'pur_receipt'],
    fields: ['request_no', 'order_no', 'supplier_id', 'material_id'],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
  },
  {
    step: 2,
    nameKey: 'cuttingManagement',
    icon: Scissors,
    tables: ['inv_cutting_record', 'inv_material_label'],
    fields: ['cutting_no', 'source_batch_no', 'material_id'],
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
  },
  {
    step: 3,
    nameKey: 'workOrderProduction',
    icon: Factory,
    tables: ['prd_work_order', 'prd_process_card'],
    fields: ['work_order_no', 'sales_order_id', 'material_id', 'plan_qty'],
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
  },
  {
    step: 4,
    nameKey: 'processFlow',
    icon: Cog,
    tables: ['prd_process_card', 'prd_standard_card'],
    fields: ['card_no', 'process_flow', 'sequences'],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
  },
  {
    step: 5,
    nameKey: 'scanBatching',
    icon: QrCode,
    tables: ['inv_scan_log', 'prd_material_issue'],
    fields: ['label_no', 'qr_content', 'material_id'],
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
  },
  {
    step: 6,
    nameKey: 'scanIssuing',
    icon: Send,
    tables: ['prd_material_issue', 'inv_inventory_log'],
    fields: ['issue_no', 'material_id', 'quantity', 'warehouse_id'],
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    textColor: 'text-teal-400',
  },
  {
    step: 7,
    nameKey: 'productionReporting',
    icon: ClipboardCheck,
    tables: ['prd_work_report'],
    fields: ['report_no', 'work_order_no', 'completed_qty'],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
  },
  {
    step: 8,
    nameKey: 'finishedGoodsInbound',
    icon: PackageCheck,
    tables: ['inv_production_inbound', 'inv_inventory'],
    fields: ['inbound_no', 'product_id', 'quantity', 'batch_no'],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
  },
  {
    step: 9,
    nameKey: 'qualityTraceability',
    icon: ShieldCheck,
    tables: ['inv_trace_record', 'qc_inspection'],
    fields: ['trace_no', 'batch_no', 'material_id'],
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-400',
  },
];

const fieldTracking = [
  {
    field: 'material_id',
    labelKey: 'materialLabel',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    path: [
      'pur_request_detail.material_id',
      'inv_cutting_record.material_id',
      'prd_work_order.material_id',
      'prd_material_issue.material_id',
      'inv_inventory.material_id',
      'inv_trace_record.material_id',
    ],
  },
  {
    field: 'order_id',
    labelKey: 'orderLabel',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    path: [
      'sal_order.id',
      'prd_work_order.sales_order_id',
      'prd_work_report.work_order_id',
      'fin_receivable.source_id',
    ],
  },
  {
    field: 'batch_no',
    labelKey: 'batchLabel',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    path: [
      'pur_receipt_detail.batch_no',
      'inv_material_label.batch_no',
      'inv_inventory.batch_no',
      'inv_trace_record.batch_no',
    ],
  },
  {
    field: 'warehouse_id',
    labelKey: 'warehouseLabel',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    path: [
      'pur_receipt.warehouse_id',
      'inv_inventory.warehouse_id',
      'prd_material_issue.warehouse_id',
      'inv_production_inbound.warehouse_id',
    ],
  },
];

interface ModuleGroup {
  nameKey: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  tables: { name: string; comment: string; fks: string[] }[];
}

const moduleGroups: ModuleGroup[] = [
  {
    nameKey: 'systemManagement',
    icon: Shield,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    tables: [
      { name: 'sys_user', comment: '用户表', fks: ['department_id → sys_department'] },
      { name: 'sys_department', comment: '部门表', fks: [] },
      { name: 'sys_role', comment: '角色表', fks: [] },
      {
        name: 'sys_user_role',
        comment: '用户角色关联',
        fks: ['user_id → sys_user', 'role_id → sys_role'],
      },
      { name: 'sys_menu', comment: '菜单表', fks: [] },
      { name: 'sys_role_menu', comment: '角色菜单关联', fks: [] },
      { name: 'sys_operation_log', comment: '操作日志', fks: [] },
      { name: 'sys_login_log', comment: '登录日志', fks: [] },
      { name: 'sys_dict_type', comment: '字典类型', fks: [] },
      { name: 'sys_dict_data', comment: '字典数据', fks: [] },
      { name: 'sys_config', comment: '系统配置', fks: [] },
    ],
  },
  {
    nameKey: 'customerManagement',
    icon: Users,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    tables: [
      { name: 'crm_customer', comment: '客户表', fks: [] },
      {
        name: 'crm_customer_contact',
        comment: '客户联系人',
        fks: ['customer_id → crm_customer'],
      },
      {
        name: 'crm_customer_follow_up',
        comment: '客户跟进',
        fks: ['customer_id → crm_customer'],
      },
    ],
  },
  {
    nameKey: 'supplierManagement',
    icon: Truck,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    tables: [
      { name: 'pur_supplier', comment: '供应商表', fks: [] },
      {
        name: 'pur_supplier_material',
        comment: '供应商物料',
        fks: ['supplier_id → pur_supplier', 'material_id → inv_material'],
      },
    ],
  },
  {
    nameKey: 'materialManagement',
    icon: Tag,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    tables: [
      { name: 'inv_material_category', comment: '物料分类', fks: [] },
      {
        name: 'inv_material',
        comment: '物料表',
        fks: ['category_id → inv_material_category'],
      },
      { name: 'inv_warehouse', comment: '仓库表', fks: [] },
      {
        name: 'inv_inventory',
        comment: '库存表',
        fks: ['material_id → inv_material', 'warehouse_id → inv_warehouse'],
      },
      {
        name: 'inv_inventory_log',
        comment: '库存日志',
        fks: ['material_id → inv_material', 'warehouse_id → inv_warehouse'],
      },
    ],
  },
  {
    nameKey: 'procurementManagement',
    icon: ShoppingCart,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    tables: [
      { name: 'pur_request', comment: '采购申请', fks: [] },
      {
        name: 'pur_request_detail',
        comment: '采购申请明细',
        fks: ['request_id → pur_request', 'material_id → inv_material'],
      },
      { name: 'pur_order', comment: '采购订单', fks: ['supplier_id → pur_supplier'] },
      {
        name: 'pur_order_detail',
        comment: '采购订单明细',
        fks: ['order_id → pur_order', 'material_id → inv_material'],
      },
      {
        name: 'pur_receipt',
        comment: '采购收货',
        fks: ['order_id → pur_order', 'supplier_id → pur_supplier', 'warehouse_id → inv_warehouse'],
      },
      { name: 'pur_receipt_detail', comment: '收货明细', fks: [] },
    ],
  },
  {
    nameKey: 'salesManagement',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    tables: [
      { name: 'sal_order', comment: '销售订单', fks: ['customer_id → crm_customer'] },
      {
        name: 'sal_order_detail',
        comment: '销售订单明细',
        fks: ['order_id → sal_order', 'material_id → inv_material'],
      },
      {
        name: 'sal_delivery',
        comment: '销售发货',
        fks: ['order_id → sal_order', 'customer_id → crm_customer', 'warehouse_id → inv_warehouse'],
      },
      { name: 'sal_delivery_detail', comment: '发货明细', fks: [] },
    ],
  },
  {
    nameKey: 'productionManagement',
    icon: Factory,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    tables: [
      { name: 'prd_standard_card', comment: '标准工艺卡', fks: [] },
      {
        name: 'prd_work_order',
        comment: '生产工单',
        fks: ['sales_order_id → sal_order', 'material_id → inv_material'],
      },
      { name: 'prd_bom', comment: 'BOM表', fks: ['material_id → inv_material'] },
      {
        name: 'prd_bom_detail',
        comment: 'BOM明细',
        fks: ['bom_id → prd_bom', 'material_id → inv_material'],
      },
    ],
  },
  {
    nameKey: 'warehouseManagement',
    icon: Warehouse,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    tables: [
      { name: 'inv_inbound_order', comment: '入库单', fks: [] },
      { name: 'inv_outbound_order', comment: '出库单', fks: [] },
      { name: 'inv_transfer_order', comment: '调拨单', fks: [] },
      { name: 'inv_material_label', comment: '物料标签', fks: [] },
      { name: 'inv_cutting_record', comment: '分切记录', fks: [] },
      { name: 'inv_scan_log', comment: '扫码日志', fks: [] },
      { name: 'inv_stocktaking', comment: '盘点记录', fks: [] },
    ],
  },
  {
    nameKey: 'qualityManagement',
    icon: FlaskConical,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    tables: [
      { name: 'qc_inspection', comment: '检验记录', fks: [] },
      { name: 'qc_unqualified', comment: '不合格记录', fks: [] },
      { name: 'inv_trace_record', comment: '追溯记录', fks: [] },
    ],
  },
  {
    nameKey: 'financeManagement',
    icon: CreditCard,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    tables: [
      {
        name: 'fin_receivable',
        comment: '应收款',
        fks: ['customer_id → crm_customer', 'source_id → sal_order'],
      },
      {
        name: 'fin_payable',
        comment: '应付款',
        fks: ['supplier_id → pur_supplier', 'source_id → pur_order'],
      },
      { name: 'fin_receipt_record', comment: '收款记录', fks: [] },
    ],
  },
  {
    nameKey: 'hrManagement',
    icon: UserCog,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    tables: [
      { name: 'hr_employee', comment: '员工表', fks: [] },
      { name: 'hr_attendance', comment: '考勤记录', fks: [] },
      { name: 'hr_training', comment: '培训记录', fks: [] },
    ],
  },
  {
    nameKey: 'equipmentManagement',
    icon: Wrench,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    tables: [
      { name: 'eqp_equipment', comment: '设备表', fks: [] },
      { name: 'eqp_maintenance_record', comment: '保养记录', fks: [] },
      { name: 'eqp_repair', comment: '维修记录', fks: [] },
    ],
  },
];

const fkConnections = [
  'sys_user.department_id → sys_department.id',
  'sys_user_role.user_id → sys_user.id, role_id → sys_role.id',
  'crm_customer_contact.customer_id → crm_customer.id',
  'pur_supplier_material.supplier_id → pur_supplier.id, material_id → inv_material.id',
  'inv_material.category_id → inv_material_category.id',
  'pur_request_detail.request_id → pur_request.id, material_id → inv_material.id',
  'pur_order.supplier_id → pur_supplier.id',
  'pur_order_detail.order_id → pur_order.id, material_id → inv_material.id',
  'pur_receipt.order_id → pur_order.id, supplier_id → pur_supplier.id, warehouse_id → inv_warehouse.id',
  'sal_order.customer_id → crm_customer.id',
  'sal_order_detail.order_id → sal_order.id, material_id → inv_material.id',
  'sal_delivery.order_id → sal_order.id, customer_id → crm_customer.id, warehouse_id → inv_warehouse.id',
  'prd_work_order.sales_order_id → sal_order.id, material_id → inv_material.id',
  'prd_bom.material_id → inv_material.id',
  'prd_bom_detail.bom_id → prd_bom.id, material_id → inv_material.id',
  'inv_inventory.material_id → inv_material.id, warehouse_id → inv_warehouse.id',
  'inv_inventory_log.material_id → inv_material.id, warehouse_id → inv_warehouse.id',
  'fin_receivable.customer_id → crm_customer.id, source_id → sal_order.id',
  'fin_payable.supplier_id → pur_supplier.id, source_id → pur_order.id',
];

const architectureLayers = [
  {
    nameKey: 'presentationLayer',
    subtitle: 'Presentation Layer',
    icon: Monitor,
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    items: [
      { name: 'Next.js App Router', desc: 'Pages & Layouts', icon: LayoutGrid },
      { name: 'React Components', desc: 'UI/UX', icon: Cog },
      { name: 'Tailwind CSS + shadcn/ui', desc: '样式系统', icon: Palette },
      { name: 'framer-motion', desc: 'Animations', icon: Workflow },
    ],
  },
  {
    nameKey: 'apiLayer',
    subtitle: 'API Layer',
    icon: Globe,
    color: 'from-cyan-600 to-cyan-700',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-400',
    items: [
      { name: 'Next.js Route Handlers', desc: '/api/*', icon: Server },
      { name: 'RESTful API Endpoints', desc: '接口规范', icon: Link2 },
      { name: 'JWT Authentication', desc: '认证中间件', icon: Lock },
      { name: 'Permission Middleware', desc: 'RBAC', icon: Shield },
      { name: 'Zod Schema Validation', desc: '数据校验', icon: CheckSquare },
    ],
  },
  {
    nameKey: 'businessLogicLayer',
    subtitle: 'Business Logic Layer',
    icon: Cpu,
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-400',
    items: [
      { name: 'Work Order State Machine', desc: '工单状态机', icon: Workflow },
      { name: 'FIFO/FEFO Inventory', desc: '库存分配策略', icon: BarChart3 },
      { name: 'Label Service', desc: 'ZPL/Thermal', icon: QrCode },
      { name: 'Production Scheduling', desc: '生产排程引擎', icon: Factory },
      { name: 'Operation Logging', desc: '操作日志服务', icon: FileText },
    ],
  },
  {
    nameKey: 'dataAccessLayer',
    subtitle: 'Data Access Layer',
    icon: HardDrive,
    color: 'from-emerald-600 to-emerald-700',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    items: [
      { name: 'MySQL2 Driver', desc: '数据库驱动', icon: Database },
      { name: 'Transaction Helper', desc: 'with FOR UPDATE', icon: Lock },
      { name: 'Optimistic Locking', desc: 'version field', icon: Shield },
      { name: 'Connection Pool', desc: '连接池管理', icon: Server },
    ],
  },
  {
    nameKey: 'databaseLayer',
    subtitle: 'Database Layer',
    icon: Database,
    color: 'from-rose-600 to-rose-700',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-400',
    items: [
      { name: 'MySQL 8.0', desc: 'vnerpdacahng', icon: Database },
      { name: '48 Business Tables', desc: '业务表', icon: Table },
      { name: 'InnoDB Engine', desc: '存储引擎', icon: Cog },
      { name: 'utf8mb4 Charset', desc: '字符集', icon: FileText },
    ],
  },
];

function Palette(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function Table(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center w-8 shrink-0">
      <svg width="32" height="24" viewBox="0 0 32 24" className="text-muted-foreground/50">
        <line
          x1="0"
          y1="12"
          x2="24"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <polygon points="24,6 32,12 24,18" fill="currentColor" />
      </svg>
    </div>
  );
}

function FlowNodeCard({ node }: { node: (typeof flowNodes)[0] }) {
  const t = useTranslations('Dashboard');
  const Icon = node.icon;
  return (
    <Card
      className={`relative overflow-hidden border ${node.borderColor} ${node.bgColor} backdrop-blur-sm w-44 shrink-0`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${node.color}`} />
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-gradient-to-br ${node.color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Step {node.step}</div>
            <div className={`text-sm font-semibold ${node.textColor}`}>{t(node.nameKey)}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Database className="h-2.5 w-2.5" />
            <span>{t('relatedTables')}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {node.tables.map((t) => (
              <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">{t('keyFields')}</div>
          <div className="flex flex-wrap gap-1">
            {node.fields.map((f) => (
              <span
                key={f}
                className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldTrackingCard({ track }: { track: (typeof fieldTracking)[0] }) {
  const t = useTranslations('Dashboard');
  return (
    <Card className={`border ${track.borderColor} ${track.bgColor}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className={`h-4 w-4 ${track.color}`} />
          <span className="font-mono">{track.field}</span>
          <Badge variant="outline" className="text-[10px] h-4 ml-auto">
            {t(track.labelKey)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {track.path.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-xs font-mono px-2 py-1 rounded bg-muted/50 text-foreground/80 whitespace-nowrap">
                {p}
              </span>
              {i < track.path.length - 1 && (
                <ArrowRight className={`h-3 w-3 ${track.color} shrink-0`} />
              )}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleGroupSection({
  group,
  defaultOpen = false,
}: {
  group: ModuleGroup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const t = useTranslations('Dashboard');
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className={`p-1.5 rounded-md ${group.bgColor}`}>
          <Icon className={`h-4 w-4 ${group.color}`} />
        </div>
        <span className="font-semibold text-sm">{t(group.nameKey)}</span>
        <Badge variant="secondary" className="text-[10px] h-4">
          {t('tableCount', { count: group.tables.length })}
        </Badge>
        <div className="ml-auto">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {group.tables.map((table) => (
            <div
              key={table.name}
              className="border border-border rounded-md p-2.5 bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs font-semibold text-foreground/90">
                  {table.name}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-1.5">{table.comment}</div>
              {table.fks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {table.fks.map((fk) => (
                    <Badge
                      key={fk}
                      variant="outline"
                      className="text-[8px] px-1 py-0 h-3.5 font-mono text-amber-500 border-amber-500/30"
                    >
                      FK: {fk}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchitectureLayerCard({
  layer,
  index,
}: {
  layer: (typeof architectureLayers)[0];
  index: number;
}) {
  const t = useTranslations('Dashboard');
  const Icon = layer.icon;
  return (
    <div className="space-y-0">
      <Card className={`relative overflow-hidden border ${layer.borderColor}`}>
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${layer.color}`} />
        <CardContent className="p-4 pt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${layer.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{t(layer.nameKey)}</span>
                <Badge variant="outline" className="text-[10px] h-4">
                  {layer.subtitle}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">Layer {index + 1}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {layer.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.name}
                  className={`flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20`}
                >
                  <ItemIcon className={`h-4 w-4 ${layer.textColor} shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {index < architectureLayers.length - 1 && (
        <div className="flex justify-center py-1">
          <svg width="40" height="28" viewBox="0 0 40 28" className="text-muted-foreground/40">
            <line
              x1="20"
              y1="0"
              x2="20"
              y2="20"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <polygon points="12,18 20,28 28,18" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function FlowPage() {
  // 翻译钩子
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');

  return (
    <MainLayout title={t('flowVisualization')}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('flowVisualization')}</h2>
          <p className="text-muted-foreground mt-1">{t('flowPageDescription')}</p>
        </div>

        <Tabs defaultValue="flow" className="space-y-4">
          <TabsList>
            <TabsTrigger value="flow" className="gap-1.5">
              <Workflow className="h-4 w-4" />
              {t('businessFlowChain')}
            </TabsTrigger>
            <TabsTrigger value="relation" className="gap-1.5">
              <Database className="h-4 w-4" />
              {t('tableRelations')}
            </TabsTrigger>
            <TabsTrigger value="architecture" className="gap-1.5">
              <Layers className="h-4 w-4" />
              {t('systemArchitectureTabs')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-blue-400" />
                  {t('productionFlowChain')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto pb-4">
                  <div className="flex items-center gap-0 min-w-max py-2">
                    {flowNodes.map((node, i) => (
                      <div key={node.step} className="flex items-center">
                        <FlowNodeCard node={node} />
                        {i < flowNodes.length - 1 && <FlowArrow />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-amber-400" />
                  {t('keyFieldPath')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fieldTracking.map((track) => (
                  <FieldTrackingCard key={track.field} track={track} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-cyan-400" />
                  {t('businessTableModules')}
                  <Badge variant="secondary" className="ml-2">
                    {t('tableModuleCount', { tables: 48, modules: 12 })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {moduleGroups.map((group) => (
                  <ModuleGroupSection
                    key={group.nameKey}
                    group={group}
                    defaultOpen={
                      group.nameKey === 'procurementManagement' ||
                      group.nameKey === 'salesManagement' ||
                      group.nameKey === 'productionManagement'
                    }
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-amber-400" />
                  {t('foreignKeyList')}
                  <Badge variant="secondary" className="ml-2">
                    {fkConnections.length}
                    {tc('foreignKeyCountSuffix')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {fkConnections.map((fk, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20"
                    >
                      <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-xs font-mono text-foreground/80">{fk}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-0">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  {t('systemArchitectureDiagram')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {architectureLayers.map((layer, i) => (
                    <ArchitectureLayerCard key={layer.nameKey} layer={layer} index={i} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
