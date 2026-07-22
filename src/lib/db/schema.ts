/**
 * Drizzle ORM Schema 映射
 *
 * 权威 schema 来源：database/vnerpdacahng_schema.sql（从目标数据库 SHOW CREATE TABLE 导出）
 * 本文件包含被 Drizzle ORM 构建器实际消费的表定义。
 * 新增 ORM 消费表时，从 SQL DDL 对应翻译并在对应 domain 文件中追加。
 *
 * 覆盖范围：95 张核心业务表
 * drizzle-kit 迁移路径已废弃（drizzle/ 目录已清理），ORM 查询构建器活跃使用中。
 *
 * 表定义按 domain 拆分在 src/lib/db/schemas/ 目录下，本文件负责统一 re-export。
 */

export { invMaterial, invInventoryBatch, invInboundOrders, invInboundItems, invWarehouse, invInventory, invOutboundOrders, invOutboundItems, invTransferOrders, invStocktaking } from './schemas/warehouse';
export { salOrder, salOrderDetail, salDelivery, salReturnOrder, salReconciliation } from './schemas/sales';
export { purPurchaseOrder, purPurchaseOrderLine, purPurchaseReturn, purPurchaseReturnLine, purPurchaseReconciliation, purSupplier } from './schemas/procurement';
export { finReceivable, finPayable } from './schemas/finance';
export { prdWorkOrder, prdSchedule, prdScheduleDetail, prdPickOrder, prdPickOrderItem, prdReturnOrder, prdReturnOrderItem, prdWorkReport, prdFinishOrder, prdStandardCard, prdProductLabel, prdBom, prdBomDetail, prdBomStd, prdBomLineStd, prdProcessCard, prdProcessCardMaterial, prdProcessRoute, prdProcessRouteStep, prdWorkOrderColorSeq, prdWorkOrderBom } from './schemas/production';
export { prodWorkOrder, prodWorkOrderItem, prodWorkOrderMaterialReq } from './schemas/workorder';
export { salQuote, salQuoteItem } from './schemas/quote';
export { sampleProcessTemplate, sampleProcessTemplateItem, sampleProcessTemplateStep } from './schemas/process';
export { dcprintSampleProcessCard, dcprintSampleProcessItem, dcprintSampleProcessStep, sampleOrder, salSampleFeedback, salSampleQuotation } from './schemas/sample';
export { dcprintInkColor, dcprintInkFormulaVersion, dcprintInkFormulaItem } from './schemas/prepress';
export { dcprintTool, dcprintToolUsage, dcprintToolMaintenance, prdDie, prdDieTemplate, prdInk, prdScreenPlate } from './schemas/tooling';
export { hrAttendance, hrTraining, hrTrainingParticipant, hrSalaryStandard, hrPieceRate, hrSalaryProfile, hrSalaryCalculation, hrPieceWorkDetail, hrAttendanceException, hrShift, hrSchedule, orgGroup, orgLegalEntity, orgFactory, orgWorkshop, orgTeam, orgPosition, hrEmployeePosition, hrSkillMatrix, hrCertificate, hrPayrollSnapshot } from './schemas/hr';
export { sysCurrency, sysExchangeRate, sysDepartment, sysEmployee, sysSalary, sagaLog } from './schemas/common';
export { qrcodeRecord, qrcodeScanLog, printLog, labelTemplate } from './schemas/trace';

export type { InvMaterial, InvInventoryBatch, InvInboundOrder, InvInboundItem, InvWarehouse, InvInventory, InvOutboundOrder, InvOutboundItem, InvTransferOrder, InvStocktaking } from './schemas/warehouse';
export type { SalOrder, SalOrderDetail, SalDelivery, SalReturnOrder, SalReconciliation } from './schemas/sales';
export type { PurPurchaseOrder, PurPurchaseOrderLine, PurPurchaseReturn, PurPurchaseReconciliation } from './schemas/procurement';
export type { FinReceivable, FinPayable } from './schemas/finance';
export type { PrdWorkOrder, PrdPickOrder, PrdPickOrderItem, PrdReturnOrder, PrdReturnOrderItem, PrdWorkReport, PrdFinishOrder, PrdSchedule, PrdScheduleDetail, PrdWorkOrderBom, PrdStandardCard, PrdProductLabel, PrdBom, PrdBomDetail, PrdBomStd, PrdBomLineStd, PrdProcessCard, PrdProcessCardMaterial, PrdProcessRoute, PrdProcessRouteStep, PrdWorkOrderColorSeq } from './schemas/production';
export type { ProdWorkOrder, ProdWorkOrderItem, ProdWorkOrderMaterialReq } from './schemas/workorder';
export type { SalQuote, SalQuoteItem } from './schemas/quote';
export type { SampleProcessTemplate, SampleProcessTemplateItem, SampleProcessTemplateStep } from './schemas/process';
export type { DcprintSampleProcessCard, DcprintSampleProcessItem, DcprintSampleProcessStep, SampleOrder, SalSampleFeedback, SalSampleQuotation } from './schemas/sample';
export type { DcprintInkColor, DcprintInkFormulaVersion, DcprintInkFormulaItem } from './schemas/prepress';
export type { DcprintTool, DcprintToolUsage, DcprintToolMaintenance, PrdDie, PrdDieTemplate, PrdInk, PrdScreenPlate } from './schemas/tooling';
export type { HrAttendance, HrTraining, HrTrainingParticipant, HrSalaryStandard, HrPieceRate, HrSalaryProfile, HrSalaryCalculation, HrPieceWorkDetail, HrAttendanceException, HrShift, HrSchedule, OrgGroup, OrgLegalEntity, OrgFactory, OrgWorkshop, OrgTeam, OrgPosition, HrEmployeePosition, HrSkillMatrix, HrCertificate, HrPayrollSnapshot } from './schemas/hr';
export type { QrcodeRecord, QrcodeScanLog, PrintLog, LabelTemplate } from './schemas/trace';
