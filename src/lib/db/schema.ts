/**
 * Drizzle ORM Schema 映射
 *
 * 权威 schema 来源：database/vnerpdacahng_schema.sql（从目标数据库 SHOW CREATE TABLE 导出）
 * 本文件包含被 Drizzle ORM 构建器实际消费的表定义。
 * 新增 ORM 消费表时，从 SQL DDL 对应翻译并在对应 domain 文件中追加。
 *
 * 覆盖范围：核心业务表（含仓库域 38 张 inv_* 表：10 张手写于 warehouse.ts + 28 张 Phase 0 生成于 _gen_warehouse_missing.ts）。
 * _bak* 备份表不建模。drizzle-kit 迁移路径已废弃（drizzle/ 目录已清理），ORM 查询构建器活跃使用中。
 *
 * 表定义按 domain 拆分在 src/lib/db/schemas/ 目录下，本文件负责统一 re-export。
 */

export {
  invMaterial,
  invInventoryBatch,
  invInboundOrders,
  invInboundItems,
  invWarehouse,
  invInventory,
  invOutboundOrders,
  invOutboundItems,
  invTransferOrders,
  invStocktaking,
} from './schemas/warehouse';
// Phase 0 补全：28 张核心 inv_* 缺失表（由 scripts/_audit/gen_warehouse_missing.cjs 生成）
export {
  invAuxiliaryInventory,
  invCuttingDetail,
  invCuttingRecord,
  invFifoOverrideLog,
  invInboundLabel,
  invInventoryLog,
  invInventoryTransaction,
  invInventoryTransactionLog,
  invLocation,
  invMaterialCategory,
  invMaterialInventory,
  invMaterialLabel,
  invMaterialStd,
  invOutboundBatchAllocation,
  invProductInventory,
  invProductionInbound,
  invProductionInboundItem,
  invSalesOutbound,
  invSalesOutboundItem,
  invScanLog,
  invStockAdjust,
  invStockAdjustItem,
  invStocktakingItem,
  invTraceDetail,
  invTraceRecord,
  invTransferItem,
  invUnitConversion,
  invWarehouseLog,
} from './schemas/_gen_warehouse_missing';
export {
  salOrder,
  salOrderDetail,
  salDelivery,
  salReturnOrder,
  salReconciliation,
} from './schemas/sales';
// sal_ 域补全：11 张核心缺失表（由 scripts/_audit/gen_sal.cjs 生成）
// 注：sal_delivery 导出名 salDeliveryHdr，规避与 sal_delivery_order(salDelivery) 冲突
export {
  salDeliveryHdr,
  salDeliveryDetail,
  salDeliveryOrderItem,
  salOrderItem,
  salReconciliationDetail,
  salReconciliationLine,
  salReconciliationWriteoff,
  salReturn,
  salReturnDetail,
  salReturnOrderItem,
  salSampleInventory,
} from './schemas/_gen_sal';
export {
  purPurchaseOrder,
  purPurchaseOrderLine,
  purPurchaseReturn,
  purPurchaseReturnLine,
  purPurchaseReconciliation,
  purSupplier,
} from './schemas/procurement';
// pur_ 域补全：9 张核心缺失表（含 5 张 *_deprecated 废弃表，真实存在须建模；由 scripts/_audit/gen_pur.cjs 生成）
export {
  purOrderDeprecated,
  purOrderDetailDeprecated,
  purPurchaseReconciliationWriteoff,
  purReceiptDeprecated,
  purReceiptDetailDeprecated,
  purRequest,
  purRequestDetail,
  purRequestItem,
  purSupplierMaterial,
} from './schemas/_gen_pur';
export { finReceivable, finPayable } from './schemas/finance';
// fin_ 域补全：9 张核心缺失表（由 scripts/_audit/gen_fin.cjs 生成）
export {
  finAccount,
  finAccountBalance,
  finCostRecord,
  finPaymentRecord,
  finPeriod,
  finReceiptRecord,
  finReceivableLine,
  finVoucher,
  finVoucherLine,
} from './schemas/_gen_fin';

// AUTO-WIRED-MISC 起点（批处理生成域）
// base_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  baseInk,
} from './schemas/_gen_base';
// biz_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  bizContractReview,
} from './schemas/_gen_biz';
// bom_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  bomHeader,
  bomLine,
} from './schemas/_gen_bom';
// crm_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  crmCustomer,
  crmCustomerAnalysis,
  crmCustomerFollowUp,
  crmFollowRecord,
  crmCustomerContact,
} from './schemas/_gen_crm';
// domain_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  domainEventOutbox,
} from './schemas/_gen_domain';
// eng_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  engSampleToMass,
  engSop,
} from './schemas/_gen_eng';
// eq_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  eqEquipment,
  eqMaintenancePlan,
  eqMaintenanceRecord,
} from './schemas/_gen_eq';
// eqp_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  eqpCalibration,
  eqpEquipment,
  eqpMaintenancePlan,
  eqpMaintenanceRecord,
  eqpRepair,
  eqpScrap,
} from './schemas/_gen_eqp';
// hr_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  hrCertificates,
  hrMesSync,
  hrOrganization,
  hrSchedules,
  hrShifts,
  hrSkills,
} from './schemas/_gen_hr';
// ink_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  inkMixedBatch,
  inkMixedBatchDetail,
  inkMixedRecord,
  inkOpeningRecord,
  inkUsage,
} from './schemas/_gen_ink';
// material_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  materialBatchCosts,
  materialRequisitions,
  materialRequisitionItems,
  materialReturns,
  materialReturnItems,
} from './schemas/_gen_material';
// mdm_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  mdmProduct,
} from './schemas/_gen_mdm';
// outsource_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  outsourceIssue,
  outsourceIssueItem,
  outsourceOrder,
  outsourceReceive,
  outsourceSettlement,
} from './schemas/_gen_outsource';
// plm_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  plmEco,
  plmLifecycle,
  plmProductLifecycle,
} from './schemas/_gen_plm';
// prd_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  prdPickOrderGen2,
  prdPickOrderItemGen2,
  prdReturnOrderGen2,
  prdReturnOrderItemGen2,
} from './schemas/_gen_prd';
// qc_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  qcAqlSamplingPlan,
  qcIncomingInspection,
  qcInspection,
  qcUnqualified,
  qcIncomingInspectionItem,
} from './schemas/_gen_qc';
// qms_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  qmsComplaint,
  qmsLabTest,
  qmsSgsCert,
  qmsSgsCertItem,
  qmsSupplierAudit,
} from './schemas/_gen_qms';
// qr_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  qrCodeRecord,
} from './schemas/_gen_qr';
// srm_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  srmSupplierEval,
  srmSupplierEvalItem,
} from './schemas/_gen_srm';
// work_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）
export {
  workOrderCosts,
} from './schemas/_gen_work';
// AUTO-WIRED-MISC 终点


export {
  prdWorkOrder,
  prdSchedule,
  prdScheduleDetail,
  prdPickOrder,
  prdPickOrderItem,
  prdReturnOrder,
  prdReturnOrderItem,
  prdWorkReport,
  prdFinishOrder,
  prdStandardCard,
  prdProductLabel,
  prdBom,
  prdBomDetail,
  prdBomStd,
  prdBomLineStd,
  prdProcessCard,
  prdProcessCardMaterial,
  prdProcessRoute,
  prdProcessRouteStep,
  prdWorkOrderColorSeq,
  prdWorkOrderBom,
} from './schemas/production';
export { prodWorkOrder, prodWorkOrderItem, prodWorkOrderMaterialReq } from './schemas/workorder';
export { salQuote, salQuoteItem } from './schemas/quote';
export {
  sampleProcessTemplate,
  sampleProcessTemplateItem,
  sampleProcessTemplateStep,
} from './schemas/process';
export {
  dcprintSampleProcessCard,
  dcprintSampleProcessItem,
  dcprintSampleProcessStep,
  sampleOrder,
  salSampleFeedback,
  salSampleQuotation,
} from './schemas/sample';
export {
  dcprintInkColor,
  dcprintInkFormulaVersion,
  dcprintInkFormulaItem,
} from './schemas/prepress';
export {
  dcprintTool,
  dcprintToolUsage,
  dcprintToolMaintenance,
  prdDie,
  prdDieTemplate,
  prdInk,
  prdScreenPlate,
} from './schemas/tooling';
export {
  hrAttendance,
  hrTraining,
  hrTrainingParticipant,
  hrSalaryStandard,
  hrPieceRate,
  hrSalaryProfile,
  hrSalaryCalculation,
  hrPieceWorkDetail,
  hrAttendanceException,
  hrShift,
  hrSchedule,
  orgGroup,
  orgLegalEntity,
  orgFactory,
  orgWorkshop,
  orgTeam,
  orgPosition,
  hrEmployeePosition,
  hrSkillMatrix,
  hrCertificate,
  hrPayrollSnapshot,
} from './schemas/hr';
export {
  sysCurrency,
  sysExchangeRate,
  sysDepartment,
  sysEmployee,
  sysSalary,
  sagaLog,
} from './schemas/common';
export {
  sysUser,
  sysRole,
  sysMenu,
  sysUserRole,
  sysRoleMenu,
  sysConfig,
  sysLoginLog,
  sysNotification,
  sysDataScope,
} from './schemas/system';
// sys_ 域补全：13 张核心缺失表（由 scripts/_audit/gen_sys.cjs 生成）
export {
  sysAnnouncement,
  sysAnnouncementRead,
  sysCalcParam,
  sysCompany,
  sysDictData,
  sysDictType,
  sysEventProcessed,
  sysMigration,
  sysNotice,
  sysOperLog,
  sysOperationLog,
  sysScheduledTask,
  sysTaskExecutionLog,
} from './schemas/_gen_sys';
export { qrcodeRecord, qrcodeScanLog, printLog, labelTemplate } from './schemas/trace';
export { reportUserConfig } from './schemas/report';

export type {
  SysUser,
  SysRole,
  SysMenu,
  SysUserRole,
  SysRoleMenu,
  SysConfig,
  SysLoginLog,
  SysNotification,
  SysDataScope,
} from './schemas/system';
export type { QrcodeRecord, QrcodeScanLog, PrintLog, LabelTemplate } from './schemas/trace';
export type { ReportUserConfig } from './schemas/report';

export type {
  InvMaterial,
  InvInventoryBatch,
  InvInboundOrder,
  InvInboundItem,
  InvWarehouse,
  InvInventory,
  InvOutboundOrder,
  InvOutboundItem,
  InvTransferOrder,
  InvStocktaking,
  SplitOrder,
  SplitOrderDetail,
} from './schemas/warehouse';
export type {
  SalOrder,
  SalOrderDetail,
  SalDelivery,
  SalReturnOrder,
  SalReconciliation,
} from './schemas/sales';
export type {
  PurPurchaseOrder,
  PurPurchaseOrderLine,
  PurPurchaseReturn,
  PurPurchaseReconciliation,
} from './schemas/procurement';
export type { FinReceivable, FinPayable } from './schemas/finance';
export type {
  PrdWorkOrder,
  PrdPickOrder,
  PrdPickOrderItem,
  PrdReturnOrder,
  PrdReturnOrderItem,
  PrdWorkReport,
  PrdFinishOrder,
  PrdSchedule,
  PrdScheduleDetail,
  PrdWorkOrderBom,
  PrdStandardCard,
  PrdProductLabel,
  PrdBom,
  PrdBomDetail,
  PrdBomStd,
  PrdBomLineStd,
  PrdProcessCard,
  PrdProcessCardMaterial,
  PrdProcessRoute,
  PrdProcessRouteStep,
  PrdWorkOrderColorSeq,
} from './schemas/production';
export type {
  ProdWorkOrder,
  ProdWorkOrderItem,
  ProdWorkOrderMaterialReq,
} from './schemas/workorder';
export type { SalQuote, SalQuoteItem } from './schemas/quote';
export type {
  SampleProcessTemplate,
  SampleProcessTemplateItem,
  SampleProcessTemplateStep,
} from './schemas/process';
export type {
  DcprintSampleProcessCard,
  DcprintSampleProcessItem,
  DcprintSampleProcessStep,
  SampleOrder,
  SalSampleFeedback,
  SalSampleQuotation,
} from './schemas/sample';
export type {
  DcprintInkColor,
  DcprintInkFormulaVersion,
  DcprintInkFormulaItem,
} from './schemas/prepress';
export type {
  DcprintTool,
  DcprintToolUsage,
  DcprintToolMaintenance,
  PrdDie,
  PrdDieTemplate,
  PrdInk,
  PrdScreenPlate,
} from './schemas/tooling';
export type {
  HrAttendance,
  HrTraining,
  HrTrainingParticipant,
  HrSalaryStandard,
  HrPieceRate,
  HrSalaryProfile,
  HrSalaryCalculation,
  HrPieceWorkDetail,
  HrAttendanceException,
  HrShift,
  HrSchedule,
  OrgGroup,
  OrgLegalEntity,
  OrgFactory,
  OrgWorkshop,
  OrgTeam,
  OrgPosition,
  HrEmployeePosition,
  HrSkillMatrix,
  HrCertificate,
  HrPayrollSnapshot,
} from './schemas/hr';
