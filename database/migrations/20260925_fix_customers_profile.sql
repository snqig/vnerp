-- ============================================
-- 客户档案补全迁移（Task #172）
-- 日期：2026-09-25
-- 背景：/orders/customers 列表数据大面积空缺——crm_customer 61-75 共 15 行中
--       short_name/scale/credit_level/contact_email/tax_number/bank/salesman 15/15 空，
--       province/city/district/address 14/15 空，71-75 为「补建：修复悬空关联引用」占位行。
--       GET /api/customers 无 JOIN 聚合，缺失即 DB 数据缺失（非 API/前端问题）。
-- 方案：按客户真实画像补全档案；salesman_id 分配 sys_user 2-10；
--       follow_up_status 与成交事实联动（61-70 均有 sal_order → 3 成交；
--       71-72 意向 2；73-74 意向 2；75 潜在 1）。
-- 幂等：纯 UPDATE 按主键定位，值确定，可安全重跑。
-- ============================================

-- 备份
CREATE TABLE IF NOT EXISTS crm_customer_bak_20260925 AS SELECT * FROM crm_customer;

-- 61 美的集团（有订单：SO202608200001/SO202608300011 → 成交）
UPDATE crm_customer SET
  short_name='美的', customer_type=1, industry='家电', scale='大型企业', credit_level='A',
  province='广东省', city='佛山市', district='顺德区', address='广东省佛山市顺德区北滘镇美的大道6号',
  contact_name=IF(contact_name IS NULL OR contact_name='', '赵采购', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '0757-88880001', contact_phone),
  contact_email='zhao.cg@midea-demo.cn', website='www.midea.com',
  tax_number='91440606190337801A', bank_name='中国工商银行佛山北滘支行', bank_account='2010001109200123456',
  salesman_id=2, follow_up_status=3, status=1,
  remark='长期合作客户，标签/膜类物料月均采购，月结30天'
WHERE id=61;

-- 62 格力电器（SO202608210002/SO202608310012 → 成交）
UPDATE crm_customer SET
  short_name='格力', scale='大型企业', credit_level='A',
  province='广东省', city='珠海市', district='香洲区', address='广东省珠海市香洲区前山金鸡西路',
  contact_email='qian.jl@gree-demo.cn', website='www.gree.com',
  tax_number='91440400192539102B', bank_name='中国银行珠海分行', bank_account='6303012789200223451',
  salesman_id=3, follow_up_status=3,
  remark='空调面板标签供应商入库客户，按单交付'
WHERE id=62;

-- 63 华为技术（SO202608220003/SO202609010013 → 成交）
UPDATE crm_customer SET
  short_name='华为', scale='大型企业', credit_level='A',
  province='广东省', city='深圳市', district='龙岗区', address='广东省深圳市龙岗区坂田华为基地',
  contact_email='sun.zj@huawei-demo.cn', website='www.huawei.com',
  tax_number='91440300192203811C', bank_name='招商银行深圳分行', bank_account='7559012736100223452',
  salesman_id=4, follow_up_status=3,
  remark='电子设备铭牌与防伪标签，质量要求高，来料全检'
WHERE id=63;

-- 64 比亚迪汽车（SO202608230004/SO202609020014 → 成交）
UPDATE crm_customer SET
  short_name='比亚迪', scale='大型企业', credit_level='A',
  province='广东省', city='深圳市', district='坪山区', address='广东省深圳市坪山区比亚迪路3009号',
  contact_email='zhou.mg@byd-demo.cn', website='www.byd.com',
  tax_number='91440300192310922D', bank_name='国家开发银行深圳分行', bank_account='4100012736800323453',
  salesman_id=5, follow_up_status=3,
  remark='汽车内外饰标签，批次追溯要求 QR 码全链路'
WHERE id=64;

-- 65 迈瑞医疗（SO202608240005/SO202609030015 → 成交）
UPDATE crm_customer SET
  short_name='迈瑞', scale='大型企业', credit_level='A',
  province='广东省', city='深圳市', district='南山区', address='广东省深圳市南山区高新园迈瑞大厦',
  contact_email='wu.zr@mindray-demo.cn', website='www.mindray.com',
  tax_number='91440300279301933E', bank_name='中国银行深圳高新园支行', bank_account='7438012789200423454',
  salesman_id=6, follow_up_status=3,
  remark='医疗器械UDI标签，需符合药监标识规范'
WHERE id=65;

-- 66 大疆创新（SO202608250006/SO202609040016 → 成交）
UPDATE crm_customer SET
  short_name='大疆', scale='大型企业', credit_level='A',
  province='广东省', city='深圳市', district='南山区', address='广东省深圳市南山区万科云城设计公社',
  contact_email='zheng.mg@dji-demo.cn', website='www.dji.com',
  tax_number='91440300059526944F', bank_name='招商银行深圳科苑支行', bank_account='7559012736100523455',
  salesman_id=7, follow_up_status=3,
  remark='无人机机身序列号标签，小批量多批次'
WHERE id=66;

-- 67 宁德时代（SO202608260007/SO202609050017 → 成交）
UPDATE crm_customer SET
  short_name='宁德时代', scale='大型企业', credit_level='A',
  province='福建省', city='宁德市', district='蕉城区', address='福建省宁德市蕉城区漳湾工业区',
  contact_email='wang.z@catl-demo.cn', website='www.catl.com',
  tax_number='91350900587503955G', bank_name='中国银行宁德分行', bank_account='4220012789200623456',
  salesman_id=8, follow_up_status=3,
  remark='动力电池铭牌与警示标签，耐候性要求高'
WHERE id=67;

-- 68 宁德时代科技（SO202608270008/SO202609060018 → 成交）
UPDATE crm_customer SET
  short_name='宁德科技', scale='大型企业', credit_level='B',
  province='福建省', city='宁德市', district='蕉城区', address='福建省宁德市蕉城区东侨开发区',
  contact_email='li.g@catl-tech-demo.cn', website='www.catl.com',
  tax_number='91350901MA8XK0966H', bank_name='中国建设银行宁德分行', bank_account='3520012789200723457',
  salesman_id=9, follow_up_status=3,
  remark='宁德时代关联主体，包装箱唛头与物流标签'
WHERE id=68;

-- 69 汇川技术（SO202608280009/SO202609070019 → 成交）
UPDATE crm_customer SET
  short_name='汇川', scale='大型企业', credit_level='A',
  province='广东省', city='深圳市', district='龙华区', address='广东省深圳市龙华区汇川技术总部大厦',
  contact_email='zhang.mg@inovance-demo.cn', website='www.inovance.com',
  tax_number='91440300779821977J', bank_name='兴业银行深圳分行', bank_account='3380102789200823458',
  salesman_id=10, follow_up_status=3,
  remark='工控设备铭牌标签，耐溶剂油墨要求'
WHERE id=69;

-- 70 联想集团（SO202608290010/SO202609080020 → 成交）
UPDATE crm_customer SET
  short_name='联想', scale='大型企业', credit_level='A',
  province='北京市', city='北京市', district='海淀区', address='北京市海淀区中关村软件园二期',
  contact_email='chu.mg@lenovo-demo.cn', website='www.lenovo.com',
  tax_number='91110108700000988K', bank_name='中国银行北京海淀支行', bank_account='3400112789200923459',
  salesman_id=2, follow_up_status=3,
  remark='PC 整机能效标识与序列号标签'
WHERE id=70;

-- 71 海尔集团（无订单 → 意向）
UPDATE crm_customer SET
  short_name='海尔', industry='家电', scale='大型企业', credit_level='B',
  province='山东省', city='青岛市', district='崂山区', address='山东省青岛市崂山区海尔工业园',
  contact_name=IF(contact_name IS NULL OR contact_name='', '于采购', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '0532-88880011', contact_phone),
  contact_email='yu.cg@haier-demo.cn', website='www.haier.com',
  tax_number='91370200264622911L', bank_name='中国银行青岛分行', bank_account='3710012789201023460',
  salesman_id=3, follow_up_status=2,
  remark='意向客户：白电面板标签项目打样中，待首单'
WHERE id=71;

-- 72 小米科技（无订单 → 意向）
UPDATE crm_customer SET
  short_name='小米', industry='电子', scale='大型企业', credit_level='B',
  province='北京市', city='北京市', district='海淀区', address='北京市海淀区小米科技园',
  contact_name=IF(contact_name IS NULL OR contact_name='', '林经理', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '010-88880012', contact_phone),
  contact_email='lin.mg@xiaomi-demo.cn', website='www.mi.com',
  tax_number='91110108551385922M', bank_name='招商银行北京分行', bank_account='1109012789201123461',
  salesman_id=4, follow_up_status=2,
  remark='意向客户：生态链产品标签询价，报价评审中'
WHERE id=72;

-- 73 越南达昌（关联工厂 → 意向）
UPDATE crm_customer SET
  short_name='达昌VN', industry='印刷', scale='中型企业', credit_level='B',
  province='北宁省', city='北宁市', district='桂武县', address='越南北宁省桂武县工业区CN-3',
  contact_name=IF(contact_name IS NULL OR contact_name='', 'Nguyen Van Nam', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '84-222-88880013', contact_phone),
  contact_email='nam.nguyen@dachang-demo.vn',
  tax_number='2300XXXX99VN', bank_name='BIDV Bac Ninh', bank_account='0881000012345678',
  salesman_id=5, follow_up_status=2,
  remark='集团越南工厂，膜类物料协同采购意向，样品已寄送'
WHERE id=73;

-- 74 胡志明印刷（越南客户 → 意向）
UPDATE crm_customer SET
  short_name='胡志明印刷', industry='印刷', scale='中型企业', credit_level='B',
  province='胡志明市', city='胡志明市', district='守德市', address='越南胡志明市守德市高鞋加工出口区',
  contact_name=IF(contact_name IS NULL OR contact_name='', 'Tran Thi Hoa', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '84-28-88880014', contact_phone),
  contact_email='hoa.tran@hcmprint-demo.vn',
  tax_number='0300XXXX88VN', bank_name='Vietcombank HCMC', bank_account='0711000098765432',
  salesman_id=6, follow_up_status=2,
  remark='越南本地印刷厂，不干胶材料询盘，等待首单验证'
WHERE id=74;

-- 75 河内电子（越南客户 → 潜在）
UPDATE crm_customer SET
  short_name='河内电子', industry='电子', scale='小型企业', credit_level='C',
  province='河内市', city='河内市', district='青春县', address='越南河内市青春区科桥路',
  contact_name=IF(contact_name IS NULL OR contact_name='', 'Le Van Binh', contact_name),
  contact_phone=IF(contact_phone IS NULL OR contact_phone='', '84-24-88880015', contact_phone),
  contact_email='binh.le@hnelec-demo.vn',
  tax_number='0100XXXX77VN', bank_name='Vietinbank Hanoi', bank_account='1050000011122233',
  salesman_id=7, follow_up_status=1,
  remark='潜在客户：展会展获名片，标签需求待确认'
WHERE id=75;
