const fs = require('fs');
const fp = 'd:/dcprint/erp-project/src/app/[locale]/prepress/die-template/page.tsx';
let c = fs.readFileSync(fp, 'utf8');

function r(oldStr, newStr) {
  const orig = c;
  c = c.split(oldStr).join(newStr);
  if (c !== orig) console.log('Replaced: ' + oldStr.substring(0,60));
}

// Fix broken replacements from previous run
r("toast({ title: '保养记录td(\"createSuccess\")' })", 'toast({ title: td("maintenanceRecordCreated") })');
r("if (!confirm('td(\"confirmCompleteMaintenance\")')) return;", 'if (!confirm(td("confirmCompleteMaintenance"))) return;');
r("if (!confirm('td(\"confirmScrap\")')) return;", 'if (!confirm(td("confirmScrap"))) return;');
r("if (!confirm('td(\"confirmDelete\")')) return;", 'if (!confirm(td("confirmDelete"))) return;');
r('立即td("completeMaintenance")', '立即完成保养'); // fix broken
r('>立即完成保养</Label>', '>{td("completeImmediately")}</Label>'); // then replace correctly

// exportColumns
r("{ key: 'template_code', header: '编号' }", "{ key: 'template_code', header: td('code') }");
r("{ key: 'asset_type_label', header: '资产类型' }", "{ key: 'asset_type_label', header: td('assetType') }");
r("{ key: 'specification', header: '规格' }", "{ key: 'specification', header: td('specification') }");
r("{ key: 'usage_info', header: '累计/最大' }", "{ key: 'usage_info', header: td('cumulativeMax') }");
r("{ key: 'usage_rate', header: '使用率' }", "{ key: 'usage_rate', header: td('usageRate') }");
r("{ key: 'lifecycle_status', header: '生命周期' }", "{ key: 'lifecycle_status', header: td('lifeCycle') }");
r("{ key: 'storage_location', header: '存放位置' }", "{ key: 'storage_location', header: td('storageLocation') }");

// handleLock action text
r("const action = item.status === 3 ? '解锁' : '锁定';", 'const action = item.status === 3 ? td("unlock") : td("lock");');
r("if (!confirm(`确定${action}此${TYPE_MAP[item.template_type]?.label || '模板'}？`)) return;", 'if (!confirm(`${action}${td("this")}${TYPE_MAP[item.template_type]?.label || td("template")}`)) return;');

// Warning table headers
r('>类型</TableHead>', '>{td("type")}</TableHead>');
r('>生命周期状态</TableHead>', '>{td("lifeCycle")}</TableHead>');
r('>距上次保养</TableHead>', '>{td("sinceLastMaintenance")}</TableHead>');

// Warning action buttons
r('>保养</Button>', '>{td("maintenance")}</Button>');
r('>记录</Button>', '>{td("recordUsage")}</Button>');

// Select placeholders and values
r('placeholder="生命周期"', 'placeholder={td("lifeCycle")}');
r('>刷新</Button>', '>{td("refresh")}</Button>');
r('>新增</Button>', '>{td("add")}</Button>');

// Sort headers
r('>编号{getSortIcon', '>{td("code")}{getSortIcon');
r('>名称{getSortIcon', '>{td("name")}{getSortIcon');

// Maintenance and usage tab refresh
r('>刷新</Button>', '>{td("refresh")}</Button>');

// Dialog form labels
r('>编号', '>{td("codeRequired")}');
r('>名称', '>{td("nameRequired")}');
r('<SelectItem value="die">刀模</SelectItem>', '<SelectItem value="die">{td("dieMold")}</SelectItem>');
r('<SelectItem value="flexo_plate">柔印版</SelectItem>', '<SelectItem value="flexo_plate">{td("flexoPlate")}</SelectItem>');
r('<SelectItem value="screen_mesh">丝网版</SelectItem>', '<SelectItem value="screen_mesh">{td("screenPlate")}</SelectItem>');
r('>规格</Label>', '>{td("specification")}</Label>');
r('>寿命参数</h4>', '>{td("lifeParams")}</h4>');
r('>保养参数</h4>', '>{td("maintenanceParams")}</h4>');
r('>备注</Label>', '>{td("remark")}</Label>');

// Dialog buttons
r('>取消</Button>', '>{tc("cancel")}</Button>');

// Usage dialog description
r('`为 ${selectedItem.template_name} (${selectedItem.template_code}) 记录使用次数`', '`${td("for")} ${selectedItem.template_name} (${selectedItem.template_code}) ${td("recordUsageTitle")}`');
r('>本次使用次数', '>{td("thisUsageCount")}');
r('>确认记录</Button>', '>{td("confirmRecord")}</Button>');

// Maintenance dialog description
r('`为 ${selectedItem.template_name} (${selectedItem.template_code}) 创建保养记录`', '`${td("for")} ${selectedItem.template_name} (${selectedItem.template_code}) ${td("createMaintenanceRecord")}`');
r('次</span>', '{td("times")}</span>');
r('>保养类型', '>{td("maintenanceType")}');
r('>备注</Label>', '>{td("remark")}</Label>');
r('>创建保养</Button>', '>{td("createMaintenance")}</Button>');

// Detail dialog labels
r('>资产类型：</span>', '>{td("assetType")}：</span>');
r('>生命周期：</span>', '>{td("lifeCycle")}：</span>');
r('>规格：</span>', '>{td("specification")}：</span>');
r('>材质：</span>', '>{td("material")}：</span>');
r('>布局：</span>', '>{td("layoutType")}：</span>');
r('>单次出件：</span>', '>{td("piecesPerImpression")}：</span>');
r(' 次</div>', ' {td("times")}</div>');
r('>已保养：</span>', '>{td("maintenanceCount")}：</span>');
r('次</div>', '{td("times")}</div>');
r('次</div>', '{td("times")}</div>'); // second occurrence

// Status card dialog table
r('>累计/最大使用率</TableHead>', '>{td("cumulativeMax")}{td("usageRate")}</TableHead>');
r('暂无记录', 'td("noRecords")');

// Status card dialog buttons
r('>保养</Button>', '>{td("maintenance")}</Button>');
r('>重做</Button>', '>{td("redo")}</Button>');
r('>详情</Button>', '>{td("detail")}</Button>');
r('>关闭</Button>', '>{td("close")}</Button>');

fs.writeFileSync(fp, c, 'utf8');
console.log('Fix done');
