const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, 'seed_part4_dcprint_qc_eqp.sql');
let sql = '';

function append(comment, table, cols, rows) {
  sql += `\n-- -----------------------------------------------------------\n-- ${comment}\n-- -----------------------------------------------------------\n`;
  sql += `INSERT IGNORE INTO ${table}\n(${cols})\nVALUES\n`;
  sql += rows.join(',\n') + ';\n\n';
}

// 9. ink_opening_record
append('9. ink_opening_record 油墨开罐记录 (20条)', 'ink_opening_record',
  'record_no, material_id, material_code, material_name, batch_no, label_id, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_id, operator_name, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i*2+1,30)).padStart(2,'0')}`;
    const inkTypes = ['UV','UV','UV','UV','UV','solvent','solvent','solvent','solvent','water','water','UV','UV','UV','UV','solvent','UV','water','UV','solvent'];
    const names = ['UV油墨-黑色','UV油墨-白色','UV油墨-红色','UV油墨-蓝色','UV油墨-黄色','溶剂油墨-黑色','溶剂油墨-白色','溶剂油墨-金色','溶剂油墨-银色','水性油墨-黑色','水性油墨-红色','UV油墨-专色红','UV油墨-专色蓝','UV光油-高光','UV光油-哑光','溶剂油墨-绿色','UV油墨-紫色','水性油墨-蓝色','UV油墨-橙色','溶剂油墨-棕色'];
    const codes = ['INK-20250512-001','INK-20250512-002','INK-20250512-003','INK-20250512-004','INK-20250512-005','INK-20250512-006','INK-20250512-007','INK-20250512-008','INK-20250512-009','INK-20250512-010','INK-20250512-011','INK-20250512-012','INK-20250512-013','INK-20250512-014','INK-20250512-015','INK-20250512-016','INK-20250512-017','INK-20250512-018','INK-20250512-019','INK-20250512-020'];
    const expH = inkTypes[i]==='UV'?168:inkTypes[i]==='solvent'?120:144;
    const qty = [5.2000,3.8000,2.5000,1.8000,1.5000,4.2000,3.0000,1.2000,0.8000,2.0000,1.5000,0.6000,0.5000,3.5000,2.8000,1.6000,0.4000,1.0000,0.5000,0.8000][i];
    const opId = (i%8)+2;
    const opNames = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰'];
    return `('IOR-20250512-${n}', ${i+1}, '${codes[i]}', '${names[i]}', 'BH202504${String(i*2+1).padStart(4,'0')}01', ${i+1}, '${inkTypes[i]}', '${d} 08:30:00', ${expH}, DATE_ADD('${d} 08:30:00', INTERVAL ${expH} HOUR), ${qty.toFixed(4)}, 'kg', 1, ${opId}, '${opNames[i%8]}', '${names[i]}开罐使用', '${d} 08:30:00', '${d} 08:30:00', 0)`;
  })
);

// 10. ink_usage
append('10. ink_usage 油墨使用记录 (20条)', 'ink_usage',
  'work_order_id, screen_plate_id, ink_id, ink_code, ink_name, usage_qty, unit, usage_date, operator_id, operator_name, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const names = ['UV油墨-黑色','UV油墨-白色','UV油墨-红色','UV油墨-蓝色','UV油墨-黄色','溶剂油墨-黑色','溶剂油墨-白色','溶剂油墨-金色','溶剂油墨-银色','水性油墨-黑色','水性油墨-红色','UV油墨-专色红','UV油墨-专色蓝','UV光油-高光','UV光油-哑光','溶剂油墨-绿色','UV油墨-紫色','水性油墨-蓝色','UV油墨-橙色','溶剂油墨-棕色'];
    const codes = ['INK-20250512-001','INK-20250512-002','INK-20250512-003','INK-20250512-004','INK-20250512-005','INK-20250512-006','INK-20250512-007','INK-20250512-008','INK-20250512-009','INK-20250512-010','INK-20250512-011','INK-20250512-012','INK-20250512-013','INK-20250512-014','INK-20250512-015','INK-20250512-016','INK-20250512-017','INK-20250512-018','INK-20250512-019','INK-20250512-020'];
    const qtys = [2.5000,1.8000,1.2000,0.8000,0.6000,2.0000,1.5000,0.5000,0.4000,1.0000,0.8000,0.3000,0.2500,1.8000,1.2000,0.6000,0.2000,0.5000,0.3000,0.4000];
    const opId = (i%8)+2;
    const opNames = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰'];
    return `(${i+1}, ${i+1}, ${i+1}, '${codes[i]}', '${names[i]}', ${qtys[i].toFixed(4)}, 'kg', '${d} 10:00:00', ${opId}, '${opNames[i%8]}', '工单${String(i+1).padStart(3,'0')}油墨使用', '${d} 10:00:00', '${d} 10:00:00', 0)`;
  })
);

// 11. ink_mixed_record
append('11. ink_mixed_record 油墨调配记录 (20条)', 'ink_mixed_record',
  'record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, location_id, status, expire_time, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const colors = ['美的红','华为蓝','格力灰','比亚迪绿','TCL橙','中兴蓝','广汽银','海信金','小米橙','OPPO绿','咖啡棕','浅灰','深紫','草绿','玫红','天蓝','军绿','珊瑚','藏青','米黄'];
    const colorCodes = ['#EF3340','#003DA5','#A7A9AC','#007A33','#F37021','#0072CE','#8A8D8F','#9B7E46','#FF6900','#00A651','#5C4033','#C8C9C7','#4A2060','#7AB648','#DA1884','#7EC8E3','#4B5320','#F88379','#0C2340','#D4C5A9'];
    const ratios = ['65:35','70:30','25:75','60:40','55:45','65:35','50:50','45:55','70:30','55:45','60:40','15:85','55:45','40:60','50:50','30:70','35:65','45:55','55:45','25:75'];
    const baseIds = [11,12,10,14,13,12,18,17,13,14,19,4,15,14,1,2,14,1,10,3];
    const baseCodes = ['BI-20250512-011','BI-20250512-012','BI-20250512-010','BI-20250512-014','BI-20250512-013','BI-20250512-012','BI-20250512-018','BI-20250512-017','BI-20250512-013','BI-20250512-014','BI-20250512-019','BI-20250512-004','BI-20250512-015','BI-20250512-014','BI-20250512-001','BI-20250512-002','BI-20250512-014','BI-20250512-001','BI-20250512-010','BI-20250512-003'];
    const baseNames = ['基础油墨-红色','基础油墨-蓝色','基础油墨-黑色','基础油墨-绿色','基础油墨-橙色','基础油墨-蓝色','基础油墨-银色','基础油墨-金色','基础油墨-橙色','基础油墨-绿色','基础油墨-棕色','基础油墨-黑色','基础油墨-紫色','基础油墨-绿色','基础油墨-品红','基础油墨-青色','基础油墨-绿色','基础油墨-品红','基础油墨-黑色','基础油墨-黄色'];
    const qtys = [5.000,4.000,3.500,3.000,4.500,3.800,4.200,3.200,5.500,4.000,2.800,3.500,2.500,3.000,3.200,4.000,2.800,3.500,3.000,4.500];
    const cids = [1,3,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    const cnames = ['美的集团','华为技术','格力电器','比亚迪','TCL科技','中兴通讯','广汽集团','海信集团','小米科技','OPPO','长虹','创维','联想','海尔','方太','志高','奥克斯','康佳','熊猫电子','苏泊尔'];
    const opId = (i%8)+2;
    const opNames = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰'];
    const wh = i%2===0?9:10;
    return `('IMR-20250512-${n}', ${baseIds[i]}, '${baseCodes[i]}', '${baseNames[i]}', '${ratios[i]}', '${colors[i]}', '${colorCodes[i]}', ${cids[i]}, '${cnames[i]}', '${d} 09:00:00', ${opId}, '${opNames[i%8]}', ${qtys[i].toFixed(4)}, 'kg', ${wh}, ${i+1}, 1, DATE_ADD('${d} 09:00:00', INTERVAL 168 HOUR), '${colors[i]}调配-${cnames[i]}项目', '${d} 09:00:00', '${d} 09:00:00', 0)`;
  })
);

// 12. prd_die_usage_log
append('12. prd_die_usage_log 刀模使用日志 (20条)', 'prd_die_usage_log',
  'die_id, die_code, work_report_id, work_order_id, work_order_no, process_name, impressions, cumulative_after, operator_id, operator_name, equipment_id, usage_date, remark, create_time',
  Array.from({length:20}, (_,i) => {
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const dieCodes = ['DIE-20250512-001','DIE-20250512-002','DIE-20250512-003','DIE-20250512-004','DIE-20250512-005','DIE-20250512-006','DIE-20250512-007','DIE-20250512-008','DIE-20250512-009','DIE-20250512-010','DIE-20250512-011','DIE-20250512-012','DIE-20250512-013','DIE-20250512-014','DIE-20250512-015','DIE-20250512-016','DIE-20250512-017','DIE-20250512-018','DIE-20250512-019','DIE-20250512-020'];
    const imprs = [5000,6000,8000,3000,2000,1500,10000,5000,8000,15000,6000,3000,4000,8000,1000,8000,12000,2500,1500,10000];
    const cumuls = [35000,42000,68000,25000,15000,8000,95000,38000,55000,120000,45000,22000,30000,78000,5000,60000,88000,18000,10000,72000];
    const procs = ['模切','模切','精密模切','模切','烫金模切','压纹','高速模切','模切','模切','高速模切','模切','烫金模切','模切','模切','压纹','模切','高速模切','模切','烫金模切','模切'];
    const opId = (i%8)+2;
    const opNames = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰'];
    return `(${i+1}, '${dieCodes[i]}', ${i+1}, ${i+1}, 'WO-202504${String(i+1).padStart(2,'0')}-${String(i+1).padStart(3,'0')}', '${procs[i]}', ${imprs[i]}, ${cumuls[i]}, ${opId}, '${opNames[i%8]}', ${i+1}, '${d}', '${dieCodes[i]}使用${imprs[i]}次', '${d} 14:00:00')`;
  })
);

// 13. prd_die_maintenance
append('13. prd_die_maintenance 刀模维护 (20条)', 'prd_die_maintenance',
  'maintenance_no, die_id, die_code, maintenance_type, impressions_before, impressions_after, maintenance_date, next_maintenance_date, cost, technician_id, technician_name, status, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i*2+1,30)).padStart(2,'0')}`;
    const dieCodes = ['DIE-20250512-001','DIE-20250512-002','DIE-20250512-003','DIE-20250512-004','DIE-20250512-005','DIE-20250512-006','DIE-20250512-007','DIE-20250512-008','DIE-20250512-009','DIE-20250512-010','DIE-20250512-011','DIE-20250512-012','DIE-20250512-013','DIE-20250512-014','DIE-20250512-015','DIE-20250512-016','DIE-20250512-017','DIE-20250512-018','DIE-20250512-019','DIE-20250512-020'];
    const types = ['routine','routine','routine','routine','repair','routine','routine','routine','repair','routine','routine','repair','routine','routine','routine','repair','routine','routine','repair','routine'];
    const imprB = [30000,36000,60000,20000,12000,6000,80000,32000,50000,100000,38000,18000,25000,65000,3000,52000,75000,15000,8000,62000];
    const imprA = [35000,42000,68000,25000,15000,8000,95000,38000,55000,120000,45000,22000,30000,78000,5000,60000,88000,18000,10000,72000];
    const costs = [800.00,950.00,1200.00,750.00,2500.00,600.00,1500.00,1100.00,3200.00,1800.00,900.00,2800.00,700.00,1300.00,500.00,2600.00,1600.00,850.00,2100.00,1400.00];
    const techId = (i%5)+6;
    const techNames = ['陈明','赵磊','孙丽','周杰','吴芳'];
    const nextD = `2025-${String(9+(i%3)).padStart(2,'0')}-${String(Math.min(i*3+1,28)).padStart(2,'0')}`;
    return `('DM-20250512-${n}', ${i+1}, '${dieCodes[i]}', '${types[i]}', ${imprB[i]}, ${imprA[i]}, '${d}', '${nextD}', ${costs[i].toFixed(2)}, ${techId}, '${techNames[i%5]}', 1, '${dieCodes[i]}${types[i]==='repair'?'修复维护':'例行维护'}', '${d} 16:00:00', '${d} 16:00:00', 0)`;
  })
);

// 14. prd_die_template
append('14. prd_die_template 刀模模板 (20条)', 'prd_die_template',
  'template_code, template_name, asset_type, layout_type, pieces_per_impression, cumulative_impressions, max_impressions, maintenance_interval, maintenance_count, last_maintenance_impressions, last_maintenance_date, last_used_date, unit_price, die_status, qr_code, template_type, specification, material, max_usage, current_usage, remaining_usage, status, storage_location, purchase_date, supplier_id, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const names = ['圆刀模模板-电池标贴','平刀模模板-空调面板','模切刀模板-手机后盖','圆刀模模板-洗衣机面板','烫金模模板-高端酒标','压纹模模板-化妆品盒','模切刀模板-电子标签','圆刀模模板-汽车内饰','平刀模模板-热收缩膜','模切刀模板-物流标签','圆刀模模板-药品标签','烫金模模板-烟包','平刀模模板-日化标签','模切刀模板-不干胶','压纹模模板-礼品盒','圆刀模模板-食品标签','模切刀模板-电池标签','平刀模模板-酒标','烫金模模板-贺卡','圆刀模模板-饮料标'];
    const types = [1,2,3,1,4,5,3,1,2,3,1,4,2,3,5,1,3,2,4,1];
    const specs = ['300mm×200mm','450mm×350mm','180mm×90mm','380mm×280mm','200mm×150mm','250mm×200mm','120mm×60mm','500mm×400mm','600mm×500mm','100mm×50mm','150mm×80mm','300mm×250mm','280mm×180mm','200mm×120mm','350mm×300mm','220mm×150mm','160mm×70mm','250mm×200mm','180mm×130mm','320mm×220mm'];
    const mats = ['高速钢','合金钢','硬质合金','高速钢','铜合金','合金钢','硬质合金','高速钢','合金钢','硬质合金','高速钢','铜合金','合金钢','硬质合金','合金钢','高速钢','硬质合金','合金钢','铜合金','高速钢'];
    const maxImp = [100000,80000,120000,90000,60000,50000,150000,70000,80000,200000,110000,50000,85000,130000,40000,95000,140000,75000,45000,105000];
    const cumImp = [35000,42000,68000,25000,15000,8000,95000,38000,55000,120000,45000,22000,30000,78000,5000,60000,88000,18000,10000,72000];
    const prices = [3500.00,4200.00,5800.00,3800.00,6500.00,5200.00,4500.00,4800.00,5500.00,3200.00,3600.00,7200.00,4000.00,4300.00,5800.00,3700.00,4600.00,4100.00,6800.00,3900.00];
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const purD = `2024-${String(6+(i%6)).padStart(2,'0')}-${String(Math.min(i*2+1,28)).padStart(2,'0')}`;
    return `('DT-20250512-${n}', '${names[i]}', 'die', 'single_row', 1, ${cumImp[i]}, ${maxImp[i]}, 30000, ${Math.floor(cumImp[i]/30000)}, ${Math.floor(cumImp[i]/30000)*30000}, '${d}', '${d}', ${prices[i].toFixed(2)}, 'available', 'QR-DT-${n}', ${types[i]}, '${specs[i]}', '${mats[i]}', ${maxImp[i]}, ${cumImp[i]}, ${maxImp[i]-cumImp[i]}, 1, '刀模仓-${String.fromCharCode(65+Math.floor(i/2))}区', '${purD}', 14, '${names[i]}标准模板', '${d} 08:00:00', '${d} 08:00:00', 2, 0)`;
  })
);

// 15. screen_plate_history
append('15. screen_plate_history 网版历史 (20条)', 'screen_plate_history',
  'screen_plate_id, action, tension_value, life_increment, remark, operator_id, operator_name, created_at',
  Array.from({length:20}, (_,i) => {
    const actions = ['exposure','use','clean','reclaim','use','exposure','use','clean','use','exposure','use','reclaim','use','clean','exposure','use','clean','use','reclaim','use'];
    const tensions = [25.50,24.80,24.20,0,23.50,26.80,26.20,25.50,24.80,21.80,21.20,0,20.50,19.80,28.80,28.20,27.50,26.30,0,25.10];
    const increments = [0,500,0,0,800,0,600,0,700,0,400,0,500,0,0,600,0,800,0,500];
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const opId = (i%8)+2;
    const opNames = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰'];
    const remarks = ['网版曝光制版','网版上机使用','网版清洗保养','网版回收翻新','网版上机使用','网版曝光制版','网版上机使用','网版清洗保养','网版上机使用','网版曝光制版','网版上机使用','网版回收翻新','网版上机使用','网版清洗保养','网版曝光制版','网版上机使用','网版清洗保养','网版上机使用','网版回收翻新','网版上机使用'];
    return `(${i+1}, '${actions[i]}', ${tensions[i].toFixed(2)}, ${increments[i]}, '${remarks[i]}', ${opId}, '${opNames[i%8]}', '${d} ${String(8+i).padStart(2,'0')}:00:00')`;
  })
);

// ============================================================
// 二、质量管理模块
// ============================================================
sql += '\n\n-- ============================================================\n-- 二、质量管理模块\n-- ============================================================\n';

// 16. qc_incoming_inspection
append('16. qc_incoming_inspection 来料检验 (20条)', 'qc_incoming_inspection',
  'inspection_no, inspection_date, supplier_id, supplier_name, material_id, material_code, material_name, specification, batch_no, quantity, unit, inspection_type, inspection_result, qualified_qty, unqualified_qty, inspector_id, inspector_name, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const sids = [1,2,3,4,5,6,3,4,7,8,9,10,1,2,3,4,5,6,3,4];
    const snames = ['东莞鑫达薄膜材料','佛山顺达PVC材料','深圳精诚油墨化工','广州永盛化工','东莞宏达丝网材料','上海紫江特种油墨','深圳精诚油墨化工','广州永盛化工','苏州雅特不干胶材料','深圳金太阳保护膜','东莞鑫达薄膜材料','佛山顺达PVC材料','东莞鑫达薄膜材料','佛山顺达PVC材料','深圳精诚油墨化工','广州永盛化工','东莞宏达丝网材料','上海紫江特种油墨','深圳精诚油墨化工','广州永盛化工'];
    const mids = [1,3,8,10,14,9,16,17,5,20,2,4,6,7,11,12,15,13,18,19];
    const mcodes = ['PET-001','PVC-001','UV-BK','SOL-BK','SCREEN-300','UV-WH','THINNER','UV-VARNISH','BOPP-001','FILM-SHRINK','PET-002','PVC-002','PE-001','PAPER-001','AG-PASTE','DIE-001','LABEL-ELEC','LABEL-AC','LABEL-WASH','LABEL-PHONE'];
    const mnames = ['PET透明膜0.1mm','PVC透明膜0.15mm','UV油墨-黑色','溶剂型油墨-黑色','丝印网版-300目','UV油墨-白色','稀释剂-标准型','UV光油-高光','BOPP透明膜0.08mm','热收缩膜','PET白膜0.125mm','PVC白膜0.2mm','PE膜0.05mm','铜版纸80g','导电银浆-高导电','模切刀模-平板','电子标签','空调面板标签','洗衣机面板标签','手机后盖标签'];
    const specs = ['1000mm×500m/卷','1000mm×400m/卷','UV固化型 粘度25-30s','溶剂型 粘度30-35s','300目 铝合金框架','UV固化型 粘度20-25s','标准型 沸点80-120°C','UV光油 固含量≥95%','800mm×600m/卷','通用型','1200mm×500m/卷','1200mm×400m/卷','600mm×400m/卷','大度889mm×1194mm','导电型 固含70%','平板式 精度±0.05mm','60mm×30mm','150mm×80mm','200mm×120mm','80mm×45mm'];
    const qtys = [1000.0000,600.0000,120.0000,80.0000,15.0000,100.0000,300.0000,50.0000,600.0000,200.0000,800.0000,750.0000,400.0000,500.0000,40.0000,10.0000,50000.0000,30000.0000,20000.0000,100000.0000];
    const results = i===7||i===15?0:1;
    const qQty = results===1?qtys[i]:qtys[i]*0.85;
    const uQty = qtys[i]-qQty;
    const inspId = (i%5)+4;
    const inspNames = ['王强','刘洋','陈明','赵磊','孙丽'];
    return `('QCI-20250512-${n}', '${d}', ${sids[i]}, '${snames[i]}', ${mids[i]}, '${mcodes[i]}', '${mnames[i]}', '${specs[i]}', 'BH202504${String(i+1).padStart(4,'0')}01', ${qtys[i].toFixed(4)}, '${i<8?"kg":"件"}', 1, ${results}, ${qQty.toFixed(4)}, ${uQty.toFixed(4)}, ${inspId}, '${inspNames[i%5]}', '${results===1?"来料检验合格":"来料检验部分不合格"}', '${d} 14:00:00', '${d} 14:00:00', ${inspId}, 0)`;
  })
);

// 17. qc_incoming_inspection_item
append('17. qc_incoming_inspection_item 来料检验明细 (40条)', 'qc_incoming_inspection_item',
  'inspection_id, item_name, standard, actual_value, result, remark, create_time, deleted',
  Array.from({length:40}, (_,i) => {
    const inspId = Math.floor(i/2)+1;
    const items = ['外观检查','尺寸测量','粘度测试','固含量检测','色差检测','pH值检测','包装完整性','标签核对'];
    const standards = ['无破损、无污染','公差±0.5mm','25-30s','≥60%','ΔE≤2.0','6.0-8.0','包装完好无破损','标签信息完整准确'];
    const actuals = ['合格','合格','27s','62%','ΔE=1.2','7.2','完好','完整','合格','合格','32s','58%','ΔE=0.8','6.8','完好','完整','合格','合格','28s','61%','ΔE=1.5','7.0','完好','完整','合格','合格','33s','59%','ΔE=1.8','7.5','完好','完整','合格','合格','26s','63%','ΔE=0.5','6.5','完好','完整','合格','合格','29s','60%','ΔE=2.5','8.2','轻微破损','信息模糊','合格','合格','31s','57%','ΔE=1.0','7.1','完好','完整','合格','合格','27s','64%','ΔE=0.3','6.9','完好','完整','合格','合格','30s','61%','ΔE=1.3','7.3','完好','完整','合格','合格','28s','62%','ΔE=0.9','7.0','完好','完整','合格','合格','26s','65%','ΔE=0.7','6.8','完好','完整','合格','合格','29s','60%','ΔE=1.1','7.2','完好','完整','合格','合格','32s','58%','ΔE=1.6','7.4','完好','完整','合格','合格','27s','63%','ΔE=0.4','6.7','完好','完整','合格','合格','25s','66%','ΔE=0.6','6.6','完好','完整','合格','合格','30s','61%','ΔE=1.4','7.1','完好','完整','合格','合格','28s','59%','ΔE=2.8','8.5','破损','信息缺失'];
    const idx = i % 8;
    const d = `2025-04-${String(Math.min(Math.floor(i/2)+1,30)).padStart(2,'0')}`;
    const result = (i===14||i===15||i===30||i===31)?0:1;
    return `(${inspId}, '${items[idx]}', '${standards[idx]}', '${actuals[i]}', ${result}, '${result===1?"符合标准":"不符合标准"}', '${d} 14:30:00', 0)`;
  })
);

// 18. qc_process_inspection
append('18. qc_process_inspection 过程检验 (20条)', 'qc_process_inspection',
  'inspection_no, inspection_date, work_order_id, work_order_no, process_name, product_id, product_code, product_name, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const procs = ['印刷','印刷','模切','印刷','烫金','印刷','模切','印刷','印刷','模切','印刷','烫金','印刷','模切','压纹','印刷','模切','印刷','烫金','模切'];
    const pids = [22,23,24,25,19,20,22,23,24,25,19,20,22,23,24,25,19,20,22,23];
    const pcodes = ['LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH'];
    const pnames = ['空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签'];
    const iq = [5000,3000,8000,4000,2000,5000,6000,2500,7000,3000,4000,2000,5500,3500,9000,4500,2500,6000,5000,3000];
    const results = i===5||i===12?0:1;
    const qq = results===1?iq[i]:Math.floor(iq[i]*0.92);
    const uq = iq[i]-qq;
    const inspNames = ['王强','刘洋','陈明','赵磊','孙丽'];
    return `('QPI-20250512-${n}', '${d}', ${i+1}, 'WO-202504${String(i+1).padStart(2,'0')}-${String(i+1).padStart(3,'0')}', '${procs[i]}', ${pids[i]}, '${pcodes[i]}', '${pnames[i]}', ${iq[i].toFixed(4)}, ${qq.toFixed(4)}, ${uq.toFixed(4)}, ${results}, '${inspNames[i%5]}', '${results===1?"过程检验合格":"过程检验发现不良"}', '${d} 15:00:00', '${d} 15:00:00', ${i%5+4}, 0)`;
  })
);

// 19. qc_final_inspection
append('19. qc_final_inspection 终检 (20条)', 'qc_final_inspection',
  'inspection_no, inspection_date, work_order_id, work_order_no, product_id, product_code, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+2,30)).padStart(2,'0')}`;
    const pids = [22,23,24,25,19,20,22,23,24,25,19,20,22,23,24,25,19,20,22,23];
    const pcodes = ['LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH'];
    const pnames = ['空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签'];
    const iq = [5000,3000,8000,4000,2000,5000,6000,2500,7000,3000,4000,2000,5500,3500,9000,4500,2500,6000,5000,3000];
    const results = i===8?0:1;
    const qq = results===1?iq[i]:Math.floor(iq[i]*0.95);
    const uq = iq[i]-qq;
    const inspNames = ['刘洋','陈明','赵磊','孙丽','周杰'];
    return `('QFI-20250512-${n}', '${d}', ${i+1}, 'WO-202504${String(i+1).padStart(2,'0')}-${String(i+1).padStart(3,'0')}', ${pids[i]}, '${pcodes[i]}', '${pnames[i]}', 'FB202504${String(i+1).padStart(4,'0')}01', ${iq[i].toFixed(4)}, ${qq.toFixed(4)}, ${uq.toFixed(4)}, ${results}, '${inspNames[i%5]}', '${results===1?"终检合格放行":"终检部分不合格需返工"}', '${d} 16:00:00', '${d} 16:00:00', ${i%5+4}, 0)`;
  })
);

// 20. qc_inspection
append('20. qc_inspection 通用检验 (20条)', 'qc_inspection',
  'inspection_no, inspection_type, source_type, source_no, material_id, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector, inspection_date, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const types = [1,1,2,1,3,1,2,1,1,3,1,2,1,1,3,2,1,1,2,3];
    const srcTypes = ['incoming','incoming','process','incoming','final','incoming','process','incoming','incoming','final','incoming','process','incoming','incoming','final','process','incoming','incoming','process','final'];
    const srcNos = [`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QPI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QFI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QPI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QFI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QPI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QFI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QPI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QCI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QPI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`,`QFI-20250512-${String(Math.min(i+1,20)).padStart(3,'0')}`];
    const mids = [1,3,8,10,14,9,16,17,5,20,2,4,6,7,11,12,15,13,18,19];
    const iq = [1000,600,120,80,15,100,300,50,600,200,800,750,400,500,40,10,50000,30000,20000,100000];
    const results = i===7||i===15?0:1;
    const qq = results===1?iq[i]:Math.floor(iq[i]*0.85);
    const inspNames = ['王强','刘洋','陈明','赵磊','孙丽'];
    return `('QI-20250512-${n}', ${types[i]}, '${srcTypes[i]}', '${srcNos[i]}', ${mids[i]}, 'BH202504${String(i+1).padStart(4,'0')}01', ${iq[i].toFixed(4)}, ${qq.toFixed(4)}, ${(iq[i]-qq).toFixed(4)}, ${results}, '${inspNames[i%5]}', '${d}', '${results===1?"检验合格":"检验不合格"}', '${d} 14:00:00', '${d} 14:00:00', 0)`;
  })
);

// 21. qc_unqualified
append('21. qc_unqualified 不合格记录 (20条)', 'qc_unqualified',
  'unqualified_no, inspection_id, source_type, source_no, material_id, material_name, quantity, defect_type, defect_desc, handle_type, handle_result, handler, handle_date, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+3,30)).padStart(2,'0')}`;
    const srcTypes = ['incoming','incoming','process','incoming','final','incoming','process','incoming','incoming','final','incoming','process','incoming','incoming','final','process','incoming','incoming','process','final'];
    const srcNos = [`QCI-20250512-008`,`QCI-20250512-016`,`QPI-20250512-006`,`QCI-20250512-003`,`QFI-20250512-009`,`QCI-20250512-005`,`QPI-20250512-013`,`QCI-20250512-002`,`QCI-20250512-007`,`QFI-20250512-010`,`QCI-20250512-001`,`QPI-20250512-004`,`QCI-20250512-011`,`QCI-20250512-014`,`QFI-20250512-015`,`QPI-20250512-017`,`QCI-20250512-019`,`QCI-20250512-020`,`QPI-20250512-018`,`QFI-20250512-012`];
    const mids = [8,10,8,8,14,9,16,17,5,20,1,4,6,7,11,12,15,13,18,19];
    const mnames = ['UV油墨-黑色','溶剂型油墨-黑色','UV油墨-黑色','UV油墨-黑色','丝印网版-300目','UV油墨-白色','稀释剂-标准型','UV光油-高光','BOPP透明膜0.08mm','热收缩膜','PET透明膜0.1mm','PVC白膜0.2mm','PE膜0.05mm','铜版纸80g','导电银浆-高导电','模切刀模-平板','电子标签','空调面板标签','洗衣机面板标签','手机后盖标签'];
    const qtys = [18.0000,12.0000,9.6000,5.4000,2.2500,15.0000,45.0000,7.5000,90.0000,30.0000,120.0000,112.5000,60.0000,75.0000,6.0000,1.5000,4000.0000,4500.0000,1600.0000,5000.0000];
    const defectTypes = ['外观不良','尺寸偏差','色差超标','粘度异常','包装破损','性能不达标','杂质超标','固含量不足','厚度偏差','收缩率异常','表面划伤','厚度不均','密封不良','克重偏差','导电率偏低','精度不足','印刷偏位','色差超标','套印不准','模切偏差'];
    const handleTypes = [2,1,3,2,1,2,1,2,1,3,1,2,1,2,3,1,2,1,3,2];
    const handleResults = [1,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,2,1];
    const handlers = ['王强','刘洋','陈明','赵磊','孙丽'];
    return `('UNQ-20250512-${n}', ${i+1}, '${srcTypes[i]}', '${srcNos[i]}', ${mids[i]}, '${mnames[i]}', ${qtys[i].toFixed(4)}, '${defectTypes[i]}', '${mnames[i]}${defectTypes[i]}不合格', ${handleTypes[i]}, ${handleResults[i]}, '${handlers[i%5]}', '${d}', '${defectTypes[i]}处理', '${d} 16:00:00', '${d} 16:00:00', 0)`;
  })
);

// 22. qc_unqualified_handle
append('22. qc_unqualified_handle 不合格处理 (20条)', 'qc_unqualified_handle',
  'handle_no, inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, handle_status, responsible_dept, responsible_person, handle_result, cost_amount, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+4,30)).padStart(2,'0')}`;
    const mids = [8,10,8,8,14,9,16,17,5,20,1,4,6,7,11,12,15,13,18,19];
    const mcodes = ['UV-BK','SOL-BK','UV-BK','UV-BK','SCREEN-300','UV-WH','THINNER','UV-VARNISH','BOPP-001','FILM-SHRINK','PET-001','PVC-002','PE-001','PAPER-001','AG-PASTE','DIE-001','LABEL-ELEC','LABEL-AC','LABEL-WASH','LABEL-PHONE'];
    const mnames = ['UV油墨-黑色','溶剂型油墨-黑色','UV油墨-黑色','UV油墨-黑色','丝印网版-300目','UV油墨-白色','稀释剂-标准型','UV光油-高光','BOPP透明膜0.08mm','热收缩膜','PET透明膜0.1mm','PVC白膜0.2mm','PE膜0.05mm','铜版纸80g','导电银浆-高导电','模切刀模-平板','电子标签','空调面板标签','洗衣机面板标签','手机后盖标签'];
    const qtys = [18.0000,12.0000,9.6000,5.4000,2.2500,15.0000,45.0000,7.5000,90.0000,30.0000,120.0000,112.5000,60.0000,75.0000,6.0000,1.5000,4000.0000,4500.0000,1600.0000,5000.0000];
    const hTypes = [2,1,3,2,1,2,1,2,1,3,1,2,1,2,3,1,2,1,3,2];
    const depts = ['采购部','品质部','生产部','采购部','品质部','采购部','品质部','采购部','品质部','生产部','采购部','品质部','采购部','品质部','生产部','品质部','生产部','品质部','生产部','品质部'];
    const persons = ['张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰','吴芳','张伟','李娜','王强','刘洋','陈明','赵磊','孙丽','周杰','吴芳','张伟','李娜'];
    const costs = [2520.0000,1440.0000,1344.0000,648.0000,1012.5000,2025.0000,1350.0000,975.0000,1800.0000,690.0000,3000.0000,2531.2500,1200.0000,1500.0000,4200.0000,750.0000,6000.0000,5850.0000,1920.0000,3250.0000];
    const results = ['退货处理-供应商承担','让步接收-降级使用','返工处理-重新印刷','退货处理-供应商承担','让步接收-降级使用','退货处理-供应商承担','让步接收-降级使用','退货处理-供应商承担','让步接收-降级使用','返工处理-重新加工','让步接收-降级使用','退货处理-供应商承担','让步接收-降级使用','退货处理-供应商承担','返工处理-重新加工','让步接收-降级使用','退货处理-供应商承担','让步接收-降级使用','返工处理-重新加工','退货处理-供应商承担'];
    return `('UH-20250512-${n}', ${i+1}, ${mids[i]}, '${mcodes[i]}', '${mnames[i]}', ${qtys[i].toFixed(4)}, ${hTypes[i]}, 1, '${depts[i]}', '${persons[i]}', '${results[i]}', ${costs[i].toFixed(4)}, '${mnames[i]}不合格处理完成', '${d} 17:00:00', '${d} 17:00:00', ${i%5+4}, 0)`;
  })
);

// 23. qms_complaint
append('23. qms_complaint 客户投诉 (20条)', 'qms_complaint',
  'complaint_no, customer_id, customer_name, order_no, product_code, product_name, complaint_type, complaint_level, defect_desc, defect_qty, total_qty, defect_rate, reporter, report_time, handler, contain_action, root_cause, corrective_action, preventive_action, verify_result, verifier, verify_time, status, close_time, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+5,30)).padStart(2,'0')}`;
    const cids = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    const cnames = ['美的集团','格力电器','华为技术','比亚迪','TCL科技','中兴通讯','广汽集团','海信集团','小米科技','OPPO','长虹','创维','联想','海尔','方太','志高','奥克斯','康佳','熊猫电子','苏泊尔'];
    const orders = [`SO-20250401-001`,`SO-20250402-002`,`SO-20250403-003`,`SO-20250405-004`,`SO-20250407-005`,`SO-20250408-006`,`SO-20250410-007`,`SO-20250411-008`,`SO-20250414-009`,`SO-20250415-010`,`SO-20250417-011`,`SO-20250418-012`,`SO-20250421-013`,`SO-20250422-014`,`SO-20250424-015`,`SO-20250425-016`,`SO-20250428-017`,`SO-20250502-018`,`SO-20250505-019`,`SO-20250508-020`];
    const pcodes = ['LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','LABEL-ELEC','LABEL-AUTO','LABEL-AC','LABEL-PHONE','LABEL-PHONE','LABEL-ELEC','LABEL-WASH','LABEL-ELEC','LABEL-AC','LABEL-ELEC','LABEL-PHONE','LABEL-WASH','LABEL-AC','LABEL-AUTO','LABEL-WASH'];
    const pnames = ['空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','电子标签','汽车内饰标签','空调面板标签','手机后盖标签','手机后盖标签','电子标签','洗衣机面板标签','电子标签','空调面板标签','电子标签','手机后盖标签','洗衣机面板标签','空调面板标签','汽车内饰标签','洗衣机面板标签'];
    const types = ['quality','quality','quality','delivery','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality','quality'];
    const levels = ['B','B','A','C','B','B','C','B','A','B','C','B','C','B','B','A','B','C','B','B'];
    const descs = ['色差偏大','套印不准','模切偏位','交期延迟1天','印刷模糊','色差超标','烫金脱落','UV光油不均匀','印刷偏位','色差偏大','套印不准','模切毛边','印刷模糊','色差偏大','粘性不足','模切偏位','套印不准','UV光油脱落','色差偏大','模切毛边'];
    const dqs = [200,150,500,0,100,80,50,120,300,100,60,80,40,100,50,200,80,60,100,80];
    const tqs = [50000,30000,100000,0,15000,20000,45000,55000,120000,90000,18000,25000,5000,40000,5000,80000,20000,60000,45000,25000];
    const rates = dqs.map((d,j)=>tqs[j]===0?0:((d/tqs[j])*100).toFixed(2));
    const handlers = ['王强','刘洋','陈明','赵磊','孙丽'];
    const statuses = i<15?3:i<18?2:1;
    return `('CMP-20250512-${n}', ${cids[i]}, '${cnames[i]}', '${orders[i]}', '${pcodes[i]}', '${pnames[i]}', '${types[i]}', '${levels[i]}', '${descs[i]}', ${dqs[i]}, ${tqs[i]}, ${rates[i]}, '${handlers[i%5]}', '${d} 09:00:00', '${handlers[(i+2)%5]}', '隔离库存+暂停发货', '油墨配比偏差/设备参数漂移', '调整油墨配方+校准设备', '增加首件确认频次+加强巡检', ${statuses===3?`'通过'`:`'待验证'`}, '${handlers[(i+3)%5]}', ${statuses===3?`'${d} 16:00:00'`:'NULL'}, ${statuses}, ${statuses===3?`'${d} 17:00:00'`:'NULL'}, '${cnames[i]}${descs[i]}投诉', '${d} 09:00:00', '${d} 09:00:00', ${i%5+4}, 0)`;
  })
);

// 24. qms_lab_test
append('24. qms_lab_test 实验室测试 (20条)', 'qms_lab_test',
  'test_no, test_type, product_id, product_code, product_name, batch_no, sample_source, test_items, test_result, overall_result, tester, test_time, reviewer, review_time, equipment_used, test_env, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const types = ['adhesion','abrasion','color','environmental','adhesion','abrasion','color','environmental','adhesion','abrasion','color','environmental','adhesion','abrasion','color','environmental','adhesion','abrasion','color','environmental'];
    const pids = [22,23,24,25,19,20,22,23,24,25,19,20,22,23,24,25,19,20,22,23];
    const pcodes = ['LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH','LABEL-PHONE','LABEL-AUTO','LABEL-ELEC','FILM-SHRINK','LABEL-AC','LABEL-WASH'];
    const pnames = ['空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签','手机后盖标签','汽车内饰标签','电子标签','热收缩膜','空调面板标签','洗衣机面板标签'];
    const sources = ['production','production','production','supplier','production','production','production','supplier','production','production','production','supplier','production','production','production','supplier','production','production','production','supplier'];
    const items = ['附着力测试(百格法),耐候性测试','耐磨测试(Taber),耐刮擦测试','色差检测(分光仪),光泽度测试','RoHS检测,REACH检测','附着力测试(百格法),耐高温测试','收缩率测试,热封强度测试','附着力测试(百格法),耐候性测试','耐磨测试(Taber),耐刮擦测试','色差检测(分光仪),光泽度测试','RoHS检测,REACH检测','附着力测试(百格法),耐高温测试','收缩率测试,热封强度测试','附着力测试(百格法),耐候性测试','耐磨测试(Taber),耐刮擦测试','色差检测(分光仪),光泽度测试','RoHS检测,REACH检测','附着力测试(百格法),耐高温测试','收缩率测试,热封强度测试','附着力测试(百格法),耐候性测试','耐磨测试(Taber),耐刮擦测试'];
    const results = ['附着力4B,耐候500h合格','耐磨500次合格,耐刮擦4级','ΔE=0.8,光泽85°','RoHS合格,REACH合格','附着力5B,耐高温120°C合格','收缩率65%,热封强度2.5N','附着力4B,耐候500h合格','耐磨500次合格,耐刮擦4级','ΔE=1.2,光泽82°','RoHS合格,REACH合格','附着力5B,耐高温120°C合格','收缩率68%,热封强度2.8N','附着力4B,耐候500h合格','耐磨500次合格,耐刮擦4级','ΔE=0.5,光泽88°','RoHS合格,REACH合格','附着力5B,耐高温120°C合格','收缩率70%,热封强度3.0N','附着力4B,耐候500h合格','耐磨500次合格,耐刮擦4级'];
    const overalls = i===8?'conditional':'pass';
    const testers = ['王强','刘洋','陈明','赵磊','孙丽'];
    return `('LT-20250512-${n}', '${types[i]}', ${pids[i]}, '${pcodes[i]}', '${pnames[i]}', 'FB202504${String(i+1).padStart(4,'0')}01', '${sources[i]}', '${items[i]}', '${results[i]}', '${overalls}', '${testers[i%5]}', '${d} 10:00:00', '${testers[(i+1)%5]}', '${d} 15:00:00', '百格刀,Taber磨耗仪,分光仪,X荧光仪', '温度23±2°C,湿度50±5%RH', '${pnames[i]}${types[i]}测试${overalls==='pass'?'合格':'有条件合格'}', '${d} 10:00:00', '${d} 15:00:00', ${i%5+4}, 0)`;
  })
);

// 25. qms_sgs_cert
append('25. qms_sgs_cert SGS认证 (20条)', 'qms_sgs_cert',
  'cert_no, material_id, material_code, material_name, supplier_id, supplier_name, cert_type, test_items, test_result, test_report_no, test_org, issue_date, expire_date, status, file_url, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const mids = [1,3,5,8,10,14,16,17,2,4,6,9,11,12,13,15,18,19,20,7];
    const mcodes = ['PET-001','PVC-001','BOPP-001','UV-BK','SOL-BK','SCREEN-300','THINNER','UV-VARNISH','PET-002','PVC-002','PE-001','UV-WH','AG-PASTE','DIE-001','LABEL-ELEC','LABEL-AC','LABEL-WASH','LABEL-PHONE','FILM-SHRINK','PAPER-001'];
    const mnames = ['PET透明膜0.1mm','PVC透明膜0.15mm','BOPP透明膜0.08mm','UV油墨-黑色','溶剂型油墨-黑色','丝印网版-300目','稀释剂-标准型','UV光油-高光','PET白膜0.125mm','PVC白膜0.2mm','PE膜0.05mm','UV油墨-白色','导电银浆-高导电','模切刀模-平板','电子标签','空调面板标签','洗衣机面板标签','手机后盖标签','热收缩膜','铜版纸80g'];
    const sids = [1,2,5,3,4,5,4,3,1,2,6,6,7,5,8,1,2,3,4,9];
    const snames = ['东莞鑫达薄膜材料','佛山顺达PVC材料','东莞宏达丝网材料','深圳精诚油墨化工','广州永盛化工','上海紫江特种油墨','苏州雅特不干胶材料','深圳金太阳保护膜','东莞鑫达薄膜材料'];
    const cTypes = ['RoHS','RoHS','RoHS','RoHS','RoHS','RoHS','MSDS','RoHS','REACH','REACH','RoHS','RoHS','RoHS','RoHS','REACH','REACH','REACH','REACH','RoHS','FSC'];
    const tItems = ['铅,汞,镉,六价铬,多溴联苯,多溴二苯醚','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚,VOC含量','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚,VOC含量','铅,汞,镉,六价铬','闪点,燃点,爆炸极限,VOC含量','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚','SVHC 211项筛查','SVHC 211项筛查','铅,汞,镉,六价铬','铅,汞,镉,六价铬,多溴联苯,多溴二苯醚','铅,汞,镉,六价铬,导电率','铅,汞,镉,六价铬','SVHC 211项筛查','SVHC 211项筛查','SVHC 211项筛查','SVHC 211项筛查','铅,汞,镉,六价铬','可持续性认证'];
    return `('SGS-20250512-${n}', ${mids[i]}, '${mcodes[i]}', '${mnames[i]}', ${sids[i]}, '${snames[Math.min(i,snames.length-1)]}', '${cTypes[i]}', '${tItems[i]}', 'pass', 'SGS-RPT-2025-${String(i+1).padStart(4,'0')}', 'SGS通标标准技术服务有限公司', '${d}', '2026-${String(Math.min(i+1,12)).padStart(2,'0')}-${String(Math.min(i+1,28)).padStart(2,'0')}', 1, '/files/SGS-${n}.pdf', '${mnames[i]}${cTypes[i]}认证合格', '${d} 10:00:00', '${d} 10:00:00', 2, 0)`;
  })
);

// 26. qms_sgs_cert_item
append('26. qms_sgs_cert_item SGS认证明细 (40条)', 'qms_sgs_cert_item',
  'cert_id, test_item_name, test_standard, limit_value, test_value, unit, result, sort_order, create_time',
  Array.from({length:40}, (_,i) => {
    const certId = Math.floor(i/2)+1;
    const items6 = ['铅(Pb)','镉(Cd)','汞(Hg)','六价铬(Cr6+)','多溴联苯(PBB)','多溴二苯醚(PBDE)'];
    const idx = i % 6;
    const limits = ['1000','100','1000','1000','1000','1000'];
    const values = ['ND','ND','ND','ND','ND','ND'];
    const d = `2025-04-${String(Math.min(Math.floor(i/2)+1,30)).padStart(2,'0')}`;
    return `(${certId}, '${items6[idx]}', 'RoHS 2.0', '${limits[idx]}', '${values[idx]}', 'mg/kg', 'pass', ${idx+1}, '${d} 10:00:00')`;
  })
);

// 27. qms_supplier_audit
append('27. qms_supplier_audit 供应商审核 (20条)', 'qms_supplier_audit',
  'audit_no, supplier_id, supplier_name, audit_type, audit_scope, audit_date, auditor, audit_items, audit_scores, total_score, conclusion, nonconformities, corrective_request, deadline, status, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const sids = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    const snames = ['东莞鑫达薄膜材料','佛山顺达PVC材料','深圳精诚油墨化工','广州永盛化工','东莞宏达丝网材料','上海紫江特种油墨','苏州雅特不干胶材料','深圳金太阳保护膜','东莞鑫达薄膜材料','佛山顺达PVC材料','深圳精诚油墨化工','广州永盛化工','东莞宏达丝网材料','上海紫江特种油墨','苏州雅特不干胶材料','深圳金太阳保护膜','东莞鑫达薄膜材料','佛山顺达PVC材料','深圳精诚油墨化工','广州永盛化工'];
    const types = ['annual','annual','follow','annual','annual','follow','annual','annual','follow','annual','annual','follow','annual','annual','follow','annual','annual','follow','annual','annual'];
    const scopes = ['质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核','不合格品跟踪审核','质量管理体系审核','质量管理体系审核'];
    const scores = [88.5,85.2,82.0,90.1,78.5,80.5,86.3,83.7,79.5,87.2,84.8,81.3,89.6,82.1,77.8,85.9,88.0,83.5,86.7,84.2];
    const conclusions = scores.map(s=>s>=85?'qualified':'conditional');
    const auditors = ['王强','刘洋','陈明','赵磊','孙丽'];
    const deadlines = `2025-05-${String(Math.min(i+15,30)).padStart(2,'0')}`;
    return `('SA-20250512-${n}', ${sids[i]}, '${snames[i]}', '${types[i]}', '${scopes[i]}', '${d}', '${auditors[i%5]}', '质量体系,生产过程,来料控制,出货检验,人员培训', '体系:${Math.floor(scores[i])},过程:${Math.floor(scores[i]-2)},来料:${Math.floor(scores[i]+1)},出货:${Math.floor(scores[i]-1)},培训:${Math.floor(scores[i]+2)}', ${scores[i].toFixed(1)}, '${conclusions[i]}', ${scores[i]<85?`'文件管控不完善,记录追溯性不足'`:'NULL'}, ${scores[i]<85?`'完善文件管控体系,加强记录追溯管理'`:'NULL'}, ${scores[i]<85?`'${deadlines}'`:'NULL'}, ${scores[i]<85?2:1}, '${snames[i]}${types[i]}审核${conclusions[i]==='qualified'?'合格':'有条件合格'}', '${d} 10:00:00', '${d} 10:00:00', ${i%5+4}, 0)`;
  })
);

// ============================================================
// 三、设备管理模块
// ============================================================
sql += '\n\n-- ============================================================\n-- 三、设备管理模块\n-- ============================================================\n';

// 28. eqp_equipment
append('28. eqp_equipment 设备 (20条)', 'eqp_equipment',
  'equipment_code, equipment_name, equipment_type, brand, model, serial_no, workshop_id, location, purchase_date, manufacturer, supplier_id, warranty_expire, rated_capacity, current_status, oee, availability, performance, quality_rate, total_run_hours, last_maintenance_date, next_maintenance_date, status, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const codes = ['EQP-20250512-001','EQP-20250512-002','EQP-20250512-003','EQP-20250512-004','EQP-20250512-005','EQP-20250512-006','EQP-20250512-007','EQP-20250512-008','EQP-20250512-009','EQP-20250512-010','EQP-20250512-011','EQP-20250512-012','EQP-20250512-013','EQP-20250512-014','EQP-20250512-015','EQP-20250512-016','EQP-20250512-017','EQP-20250512-018','EQP-20250512-019','EQP-20250512-020'];
    const names = ['1号柔印机','2号柔印机','3号凹印机','4号丝印机','5号凹印机','1号模切机','2号模切机','1号复卷机','2号复卷机','1号分条机','2号分条机','1号检品机','2号检品机','1号涂布机','2号涂布机','1号复合机','2号复合机','1号烫金机','2号烫金机','1号数字印刷机'];
    const types = [1,1,2,3,2,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11];
    const brands = ['博斯特','博斯特','西江','湄洲','西江','博远','博远','德信','德信','博远','博远','德信','德信','博斯特','博斯特','西江','西江','博远','博远','惠普'];
    const models = ['L-350','L-350','R-850','S-600','R-1200','D-500','D-500','W-800','W-800','S-300','S-300','I-600','I-600','C-1000','C-1000','L-800','L-800','H-400','H-400','HP-Indigo'];
    const serials = ['SN-2023-001','SN-2023-002','SN-2022-003','SN-2024-004','SN-2022-005','SN-2023-006','SN-2023-007','SN-2024-008','SN-2024-009','SN-2023-010','SN-2023-011','SN-2024-012','SN-2024-013','SN-2022-014','SN-2022-015','SN-2023-016','SN-2023-017','SN-2024-018','SN-2024-019','SN-2025-020'];
    const wids = [1,1,2,3,2,4,4,5,5,6,6,7,7,8,8,9,9,10,10,3];
    const locs = ['A栋1楼','A栋1楼','A栋2楼','B栋1楼','A栋2楼','B栋2楼','B栋2楼','C栋1楼','C栋1楼','C栋2楼','C栋2楼','D栋1楼','D栋1楼','A栋3楼','A栋3楼','B栋3楼','B栋3楼','D栋2楼','D栋2楼','B栋1楼'];
    const purDs = ['2023-03-15','2023-06-20','2022-09-10','2024-01-15','2022-11-20','2023-08-05','2023-09-12','2024-02-28','2024-03-15','2023-04-20','2023-07-10','2024-04-01','2024-05-15','2022-06-10','2022-08-25','2023-05-15','2023-10-20','2024-06-01','2024-07-15','2025-01-10'];
    const mans = ['瑞士博斯特','瑞士博斯特','日本西江','中国湄洲','日本西江','深圳博远','深圳博远','珠海德信','珠海德信','深圳博远','深圳博远','珠海德信','珠海德信','瑞士博斯特','瑞士博斯特','日本西江','日本西江','深圳博远','深圳博远','美国惠普'];
    const supIds = [15,15,15,14,15,14,14,14,14,15,15,14,14,15,15,15,15,14,14,15];
    const warExps = ['2025-03-15','2025-06-20','2024-09-10','2026-01-15','2024-11-20','2025-08-05','2025-09-12','2026-02-28','2026-03-15','2025-04-20','2025-07-10','2026-04-01','2026-05-15','2024-06-10','2024-08-25','2025-05-15','2025-10-20','2026-06-01','2026-07-15','2027-01-10'];
    const caps = [150.0000,150.0000,200.0000,80.0000,250.0000,120.0000,120.0000,180.0000,180.0000,100.0000,100.0000,160.0000,160.0000,120.0000,120.0000,140.0000,140.0000,90.0000,90.0000,60.0000];
    const stats = i===2?2:i===13?3:1;
    const oees = [85.50,83.20,0,78.60,88.10,82.30,80.50,86.70,84.90,79.80,81.20,90.10,88.50,0,76.30,84.60,82.80,87.20,85.40,75.60];
    const avs = [92.30,90.50,0,85.20,94.10,88.60,87.30,93.50,91.80,86.40,88.10,95.20,93.80,0,83.50,91.20,89.60,94.10,92.30,82.40];
    const perfs = [93.50,92.80,0,91.20,94.80,93.50,92.10,93.80,92.60,91.50,92.30,95.30,94.60,0,90.80,93.20,92.50,93.80,92.90,91.20];
    const qrs = [98.80,99.10,0,99.50,98.50,98.20,99.00,98.60,99.20,99.30,98.90,99.10,99.00,0,99.40,99.00,99.20,98.50,99.10,99.50];
    const runHs = [8500.00,7200.00,0,3200.00,9800.00,6500.00,5800.00,4100.00,3800.00,5600.00,4900.00,2800.00,2200.00,0,12000.00,7200.00,6800.00,3500.00,3100.00,1500.00];
    const lastM = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const nextM = `2025-07-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    return `('${codes[i]}', '${names[i]}', ${types[i]}, '${brands[i]}', '${models[i]}', '${serials[i]}', ${wids[i]}, '${locs[i]}', '${purDs[i]}', '${mans[i]}', ${supIds[i]}, '${warExps[i]}', ${caps[i].toFixed(4)}, ${stats}, ${oees[i].toFixed(2)}, ${avs[i].toFixed(2)}, ${perfs[i].toFixed(2)}, ${qrs[i].toFixed(2)}, ${runHs[i].toFixed(2)}, '${lastM}', '${nextM}', 1, '${names[i]}${stats===1?'正常运行':stats===2?'维修中':'保养中'}', '${lastM} 08:00:00', '${lastM} 08:00:00', 2, 0)`;
  })
);

// 29. eqp_calibration
append('29. eqp_calibration 设备校准 (20条)', 'eqp_calibration',
  'calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, status, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const codes = ['EQP-20250512-001','EQP-20250512-002','EQP-20250512-003','EQP-20250512-004','EQP-20250512-005','EQP-20250512-006','EQP-20250512-007','EQP-20250512-008','EQP-20250512-009','EQP-20250512-010','EQP-20250512-011','EQP-20250512-012','EQP-20250512-013','EQP-20250512-014','EQP-20250512-015','EQP-20250512-016','EQP-20250512-017','EQP-20250512-018','EQP-20250512-019','EQP-20250512-020'];
    const names = ['1号柔印机','2号柔印机','3号凹印机','4号丝印机','5号凹印机','1号模切机','2号模切机','1号复卷机','2号复卷机','1号分条机','2号分条机','1号检品机','2号检品机','1号涂布机','2号涂布机','1号复合机','2号复合机','1号烫金机','2号烫金机','1号数字印刷机'];
    const nextD = `2025-10-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const orgs = ['广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院','广东省计量科学研究院','深圳市计量质量检测研究院'];
    const costs = [3500.0000,3500.0000,4200.0000,2800.0000,4200.0000,3000.0000,3000.0000,2500.0000,2500.0000,2200.0000,2200.0000,2800.0000,2800.0000,3800.0000,3800.0000,3200.0000,3200.0000,2600.0000,2600.0000,4500.0000];
    return `('CAL-20250512-${n}', ${i+1}, '${codes[i]}', '${names[i]}', '${d}', '${nextD}', '${orgs[i]}', 1, 'CAL-CERT-${n}', ${costs[i].toFixed(4)}, 1, '${names[i]}年度校准合格', '${d} 09:00:00', '${d} 09:00:00', 2, 0)`;
  })
);

// 30. eqp_maintenance_plan
append('30. eqp_maintenance_plan 维护计划 (20条)', 'eqp_maintenance_plan',
  'plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, status, complete_date, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const mTypes = [1,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,2,1];
    const cTypes = [2,2,1,2,2,2,1,2,2,3,2,1,2,2,1,3,2,2,1,2];
    const cVals = [30,30,90,30,30,30,90,30,30,15,30,90,30,30,90,15,30,30,90,30];
    const contents = ['日常保养:清洁润滑检查','日常保养:清洁润滑检查','深度保养:更换易损件校准','日常保养:清洁润滑检查','日常保养:清洁润滑检查','日常保养:清洁润滑检查','深度保养:更换刀片校准','日常保养:清洁润滑检查','日常保养:清洁润滑检查','日常保养:清洁检查张力','日常保养:清洁润滑检查','深度保养:更换光源校准','日常保养:清洁润滑检查','日常保养:清洁润滑检查','深度保养:更换涂布头','日常保养:清洁检查张力','日常保养:清洁润滑检查','日常保养:清洁润滑检查','深度保养:更换烫金版','日常保养:清洁校准喷头'];
    const statuses = i<10?2:1;
    const compD = statuses===2?`'${d}'`:'NULL';
    return `('MP-20250512-${n}', ${i+1}, ${mTypes[i]}, ${cTypes[i]}, ${cVals[i]}, '${d}', ${(i%5)+6}, '${contents[i]}', ${statuses}, ${compD}, '${contents[i]}${statuses===2?'已完成':'待执行'}', '${d} 08:00:00', '${d} 08:00:00', 0)`;
  })
);

// 31. eqp_maintenance_record
append('31. eqp_maintenance_record 维护记录 (20条)', 'eqp_maintenance_record',
  'record_no, plan_id, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result, remark, create_time, update_time, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+1,30)).padStart(2,'0')}`;
    const mTypes = [1,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,2,1];
    const faultDescs = ['无故障-例行保养','无故障-例行保养','印刷套准偏移','无故障-例行保养','无故障-例行保养','无故障-例行保养','模切精度下降','无故障-例行保养','无故障-例行保养','无故障-例行保养','无故障-例行保养','检测光源衰减','无故障-例行保养','无故障-例行保养','涂布均匀度偏差','无故障-例行保养','无故障-例行保养','无故障-例行保养','烫金压力不均','无故障-例行保养'];
    const contents = ['清洁润滑更换耗材','清洁润滑更换耗材','更换轴承校准套准系统','清洁润滑更换耗材','清洁润滑更换耗材','清洁润滑更换耗材','更换刀片校准模切精度','清洁润滑更换耗材','清洁润滑更换耗材','清洁检查更换张力弹簧','清洁润滑更换耗材','更换UV光源校准检测参数','清洁润滑更换耗材','清洁润滑更换耗材','更换涂布头校准涂布参数','清洁检查更换张力辊','清洁润滑更换耗材','清洁润滑更换耗材','更换烫金版调整压力','清洁校准喷头更换墨盒'];
    const dhs = [2.00,2.50,8.00,1.50,2.00,2.50,6.00,1.50,2.00,1.00,2.50,5.00,1.50,2.00,7.00,1.00,2.50,2.00,6.50,3.00];
    const costs = [500.0000,600.0000,3500.0000,450.0000,550.0000,600.0000,2800.0000,450.0000,500.0000,300.0000,550.0000,2200.0000,450.0000,500.0000,3200.0000,350.0000,600.0000,500.0000,2500.0000,1800.0000];
    return `('MR-20250512-${n}', ${i+1}, ${i+1}, ${mTypes[i]}, '${faultDescs[i]}', '${contents[i]}', '${d} 08:00:00', '${d} ${String(8+Math.ceil(dhs[i])).padStart(2,'0')}:00:00', ${dhs[i].toFixed(2)}, ${costs[i].toFixed(4)}, ${(i%5)+6}, 1, '${contents[i]}完成', '${d} 16:00:00', '${d} 16:00:00', 0)`;
  })
);

// 32. eqp_repair
append('32. eqp_repair 设备维修 (20条)', 'eqp_repair',
  'repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, repair_start_time, repair_end_time, repair_cost, repair_result, status, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i*2+1,30)).padStart(2,'0')}`;
    const codes = ['EQP-20250512-001','EQP-20250512-002','EQP-20250512-003','EQP-20250512-004','EQP-20250512-005','EQP-20250512-006','EQP-20250512-007','EQP-20250512-008','EQP-20250512-009','EQP-20250512-010','EQP-20250512-011','EQP-20250512-012','EQP-20250512-013','EQP-20250512-014','EQP-20250512-015','EQP-20250512-016','EQP-20250512-017','EQP-20250512-018','EQP-20250512-019','EQP-20250512-020'];
    const names = ['1号柔印机','2号柔印机','3号凹印机','4号丝印机','5号凹印机','1号模切机','2号模切机','1号复卷机','2号复卷机','1号分条机','2号分条机','1号检品机','2号检品机','1号涂布机','2号涂布机','1号复合机','2号复合机','1号烫金机','2号烫金机','1号数字印刷机'];
    const faultDescs = ['套准系统异常','墨泵压力不稳','主电机异响','刮刀磨损过快','张力控制器失灵','模切刀片断裂','气压系统漏气','收卷张力不均','导辊轴承磨损','分切刀口毛刺','纠偏系统偏差','CCD相机故障','传送带打滑','涂布头堵塞','烘箱温控异常','复合辊压力不均','胶水供给系统故障','烫金版磨损','温控系统报警','喷头堵塞'];
    const rTypes = [1,2,1,2,1,1,2,2,1,2,1,1,2,1,1,2,1,2,1,2];
    const persons = ['李师傅','王师傅','张师傅','赵师傅','刘师傅','李师傅','王师傅','张师傅','赵师傅','刘师傅','李师傅','王师傅','张师傅','赵师傅','刘师傅','李师傅','王师傅','张师傅','赵师傅','刘师傅'];
    const endD = `2025-04-${String(Math.min(i*2+2,30)).padStart(2,'0')}`;
    const costs = [2500.0000,800.0000,5500.0000,600.0000,3200.0000,1800.0000,500.0000,700.0000,1200.0000,400.0000,2000.0000,3500.0000,300.0000,2800.0000,1500.0000,600.0000,2200.0000,900.0000,1800.0000,1200.0000];
    const statuses = i<16?2:1;
    return `('REP-20250512-${n}', ${i+1}, '${codes[i]}', '${names[i]}', '${d}', '${faultDescs[i]}', ${rTypes[i]}, '${persons[i]}', '${d} 09:00:00', '${endD} 17:00:00', ${costs[i].toFixed(4)}, '${faultDescs[i]}已修复设备恢复正常', ${statuses}, '${names[i]}${faultDescs[i]}维修${statuses===2?'已完成':'进行中'}', '${d} 09:00:00', '${d} 17:00:00', 2, 0)`;
  })
);

// 33. eqp_scrap
append('33. eqp_scrap 设备报废 (20条)', 'eqp_scrap',
  'scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, status, remark, create_time, update_time, create_by, deleted',
  Array.from({length:20}, (_,i) => {
    const n = String(i+1).padStart(3,'0');
    const d = `2025-04-${String(Math.min(i+5,30)).padStart(2,'0')}`;
    const codes = ['EQP-20250512-001','EQP-20250512-002','EQP-20250512-003','EQP-20250512-004','EQP-20250512-005','EQP-20250512-006','EQP-20250512-007','EQP-20250512-008','EQP-20250512-009','EQP-20250512-010','EQP-20250512-011','EQP-20250512-012','EQP-20250512-013','EQP-20250512-014','EQP-20250512-015','EQP-20250512-016','EQP-20250512-017','EQP-20250512-018','EQP-20250512-019','EQP-20250512-020'];
    const names = ['1号柔印机','2号柔印机','3号凹印机','4号丝印机','5号凹印机','1号模切机','2号模切机','1号复卷机','2号复卷机','1号分条机','2号分条机','1号检品机','2号检品机','1号涂布机','2号涂布机','1号复合机','2号复合机','1号烫金机','2号烫金机','1号数字印刷机'];
    const reasons = ['使用年限到期-已超10年','使用年限到期-已超10年','核心部件损坏-维修成本过高','技术淘汰-产能不足','使用年限到期-已超10年','多次维修仍存在精度问题','使用年限到期-已超8年','技术升级-新设备替代','使用年限到期-已超8年','技术淘汰-精度不达标','多次维修仍存在故障','使用年限到期-已超8年','技术升级-新设备替代','核心部件损坏-维修成本过高','使用年限到期-已超10年','技术淘汰-速度不达标','使用年限到期-已超8年','多次维修仍存在压力问题','技术升级-新设备替代','喷头老化-更换成本过高'];
    const origVals = [850000.0000,850000.0000,1200000.0000,350000.0000,1500000.0000,450000.0000,450000.0000,380000.0000,380000.0000,280000.0000,280000.0000,520000.0000,520000.0000,980000.0000,980000.0000,650000.0000,650000.0000,420000.0000,420000.0000,1800000.0000];
    const netVals = [50000.0000,45000.0000,80000.0000,20000.0000,100000.0000,30000.0000,25000.0000,22000.0000,20000.0000,15000.0000,18000.0000,35000.0000,30000.0000,65000.0000,60000.0000,40000.0000,35000.0000,25000.0000,22000.0000,120000.0000];
    const approvals = ['总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总','总经理-张总'];
    const statuses = i<15?2:1;
    return `('SCR-20250512-${n}', ${i+1}, '${codes[i]}', '${names[i]}', '${d}', '${reasons[i]}', ${origVals[i].toFixed(4)}, ${netVals[i].toFixed(4)}, '${approvals[i]}', ${statuses}, '${names[i]}报废${statuses===2?'已审批':'待审批'}', '${d} 10:00:00', '${d} 10:00:00', 2, 0)`;
  })
);

sql += '\nSET FOREIGN_KEY_CHECKS=1;\n';

fs.appendFileSync(outFile, sql, 'utf8');
console.log('SQL appended successfully. Total length: ' + sql.length);
