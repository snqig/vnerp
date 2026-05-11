# 业务术语表

> 文档编号：VNERP-WIKI-BIZ-003 | 版本：V1.0 | 更新日期：2026-05-10

## 丝网印刷术语

| 术语 | 英文 | 说明 |
|------|------|------|
| 丝网印刷 | Screen Printing | 使用丝网版进行印刷的工艺 |
| 网版 | Screen/Stencil | 带有图文的丝网印版 |
| 目数 | Mesh Count | 丝网每英寸的网孔数量 |
| 张力 | Tension | 丝网绷紧的程度，单位 N/cm |
| 刮刀 | Squeegee | 将油墨通过网孔刮印到承印物上的工具 |
| 晒版 | Exposure | 用紫外线将图文转移到丝网版上的过程 |
| 套印 | Registration | 多色印刷时各色版对准的过程 |
| 模切 | Die Cutting | 用刀具将印刷品切成所需形状 |
| UV固化 | UV Curing | 紫外线照射使油墨快速干燥固化 |

## ERP 通用术语

| 术语 | 英文 | 说明 |
|------|------|------|
| BOM | Bill of Materials | 物料清单，产品的组成结构 |
| MRP | Material Requirements Planning | 物料需求计划 |
| FIFO | First In First Out | 先进先出原则 |
| WIP | Work In Process | 在制品 |
| IQC | Incoming Quality Control | 来料检验 |
| IPQC | In-Process Quality Control | 过程检验 |
| FQC | Final Quality Control | 成品检验 |
| OQC | Outgoing Quality Control | 出货检验 |
| AQL | Acceptable Quality Limit | 接收质量限 |
| SPC | Statistical Process Control | 统计过程控制 |

## VNERP 系统术语

| 术语 | 说明 | 对应表/字段 |
|------|------|------------|
| 标准卡 | 丝网印刷工艺标准文档 | prd_standard_card |
| 拆分 | 大包装物料按标准单位拆分 | qrcode_record.split_flag |
| 小料 | 拆分后的标准单位物料 | split_flag = 1 |
| 余料 | 拆分后不足一个标准单位的物料 | split_flag = 2 |
| 整料 | 未拆分的原始物料 | split_flag = 0 |
| 追溯 | 通过二维码追踪物料流向 | qrcode_record.parent_qr_id |
| 报工 | 生产工序完工报告 | prd_work_report |
| 盘点 | 库存实物与账面核对 | inv_stocktaking |
| 调拨 | 仓库间物料转移 | inv_transfer_order |
