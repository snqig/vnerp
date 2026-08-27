const fs = require('fs');
const fp = 'd:/dcprint/erp-project/src/app/[locale]/prepress/die-template/page.tsx';
let c = fs.readFileSync(fp, 'utf8');

// Add td translation hook alongside existing t and tc
if (!c.includes("const td = useTranslations('DieTemplate')")) {
  c = c.replace("const tc = useTranslations('Common');", "const tc = useTranslations('Common');\n  const td = useTranslations('DieTemplate');");
}

function r(oldStr, newStr) {
  const orig = c;
  c = c.split(oldStr).join(newStr);
  if (c !== orig) console.log('Replaced: ' + oldStr.substring(0,60));
}

// 1. MainLayout title
r('title="刀模/网版寿命管理"', 'title={td("title")}');

// 2. Dashboard cards
r('>总数</div>', '>{td("totalCount")}</div>');
r('>可用</div>', '>{td("available")}</div>');
r('>需保养</div>', '>{td("maintenanceNeeded")}</div>');
r('>需重做</div>', '>{td("reRuleNeeded")}</div>');
r('>已报废</div>', '>{td("scrap")}</div>');
r('>待保养</div>', '>{td("maintenanceDue")}</div>');

// 3. Warning card
r('寿命预警 (', '{td("lifeWarning")} (');
r('以下刀模/网版已达到预警使用次数，请注意及时保养或更换！', '{td("warningDesc")}');

// 4. Card title and desc
r('<CardTitle>刀模/网版管理</CardTitle>', '<CardTitle>{td("dieTemplateManage")}</CardTitle>');
r('管理刀模和丝网版的使用寿命、预警、保养和生命周期', '{td("manageDesc")}');

// 5. Search placeholder
r('placeholder="搜索编号/名称/二维码..."', 'placeholder={td("searchPlaceholder")}');

// 6. Select filters
r('<SelectItem value="all">全部类型</SelectItem>', '<SelectItem value="all">{td("allTypes")}</SelectItem>');
r('<SelectItem value="1">刀模</SelectItem>', '<SelectItem value="1">{td("dieMold")}</SelectItem>');
r('<SelectItem value="2">丝网版</SelectItem>', '<SelectItem value="2">{td("screenPlate")}</SelectItem>');
r('<SelectItem value="all">全部状态</SelectItem>', '<SelectItem value="all">{td("allStatus")}</SelectItem>');
r('<SelectItem value="available">可用</SelectItem>', '<SelectItem value="available">{td("available")}</SelectItem>');
r('<SelectItem value="in_use">使用中</SelectItem>', '<SelectItem value="in_use">{td("inUse")}</SelectItem>');
r('<SelectItem value="maintenance_needed">需保养</SelectItem>', '<SelectItem value="maintenance_needed">{td("maintenanceNeeded")}</SelectItem>');
r('<SelectItem value="re_rule_needed">需重做</SelectItem>', '<SelectItem value="re_rule_needed">{td("reRuleNeeded")}</SelectItem>');
r('<SelectItem value="scrap">已报废</SelectItem>', '<SelectItem value="scrap">{td("scrap")}</SelectItem>');

// 7. Refresh button
r('>刷新</Button>', '>{td("refresh")}</Button>');

// 8. Export toolbar
r("'刀模/网版列表'", 'td("dieTemplateList")');

// 9. Add button
r('>新增</Button>', '>{td("add")}</Button>');

// 10. Tabs
r("{ label: '资产列表' }", '{ label: td("assetList") }');
r("{ label: '保养记录' }", '{ label: td("maintenanceRecord") }');
r("{ label: '使用记录' }", '{ label: td("usageRecord") }');
r("'资产列表'", 'td("assetList")');
r("'保养记录'", 'td("maintenanceRecord")');
r("'使用记录'", 'td("usageRecord")');

// 11. Table headers
r('>序号</TableHead>', '>{td("serialNo")}</TableHead>');
r('>编号{getSortIcon', '>{td("code")}{getSortIcon');
r('>名称{getSortIcon', '>{td("name")}{getSortIcon');
r('>资产类型</TableHead>', '>{td("assetType")}</TableHead>');
r('>规格</TableHead>', '>{td("specification")}</TableHead>');
r('>累计/最大</TableHead>', '>{td("cumulativeMax")}</TableHead>');
r('>使用率</TableHead>', '>{td("usageRate")}</TableHead>');
r('>生命周期</TableHead>', '>{td("lifeCycle")}</TableHead>');
r('>保养进度</TableHead>', '>{td("maintenanceProgress")}</TableHead>');
r('>存放位置</TableHead>', '>{td("storageLocation")}</TableHead>');
r('>操作</TableHead>', '>{td("operation")}</TableHead>');

// 12. No data
r('暂无刀模/网版记录', 'td("noDieTemplateRecords")');

// 13. Action buttons tooltips
r('title="记录使用"', 'title={td("recordUsage")}');
r('title="保养"', 'title={td("maintenance")}');
r("title={item.status === 3 ? '解锁' : '锁定'}", 'title={item.status === 3 ? td("unlock") : td("lock")}');
r('title="报废"', 'title={td("scrapAction")}');

// 14. Maintenance tab
r('>保养记录</h3>', '>{td("maintenanceRecords")}</h3>');
r('>保养单号</TableHead>', '>{td("maintenanceNo")}</TableHead>');
r('>刀模编码</TableHead>', '>{td("dieCode")}</TableHead>');
r('>名称</TableHead>', '>{td("name")}</TableHead>');
r('>保养类型</TableHead>', '>{td("maintenanceType")}</TableHead>');
r('>保养前次数</TableHead>', '>{td("beforeMaintenance")}</TableHead>');
r('>保养后次数</TableHead>', '>{td("afterMaintenance")}</TableHead>');
r('>费用</TableHead>', '>{td("cost")}</TableHead>');
r('>保养人员</TableHead>', '>{td("maintenancePerson")}</TableHead>');
r('>状态</TableHead>', '>{td("status")}</TableHead>');
// operation already replaced above, skip duplicate
r('完成保养', 'td("completeMaintenance")');
r('暂无保养记录', 'td("noMaintenanceRecords")');

// 15. Usage tab
r('>使用记录</h3>', '>{td("usageRecords")}</h3>');
// dieCode, name already replaced
r('>工单号</TableHead>', '>{td("workOrderNo")}</TableHead>');
r('>工序</TableHead>', '>{td("process")}</TableHead>');
r('>本次次数</TableHead>', '>{td("thisTime")}</TableHead>');
r('>累计次数</TableHead>', '>{td("cumulativeCount")}</TableHead>');
r('>操作员</TableHead>', '>{td("operator")}</TableHead>');
r('>使用日期</TableHead>', '>{td("usageDate")}</TableHead>');
r('暂无使用记录', 'td("noUsageRecords")');

// 16. Dialog titles
r("{editing ? '编辑刀模/网版' : '新增刀模/网版'}", '{editing ? td("editDieTemplate") : td("addDieTemplate")}');
r("{editing ? '修改刀模/网版信息' : '创建新的刀模/网版记录'}", '{editing ? td("editDesc") : td("createDesc")}');

// 17. Form labels
r('>编号', '>{td("codeRequired")}');
r('>名称', '>{td("nameRequired")}');
r('placeholder="如 DM-001"', 'placeholder={td("codePlaceholder")}');
r('placeholder="刀模/网版名称"', 'placeholder={td("namePlaceholder")}');
r('>传统类型</Label>', '>{td("traditionalType")}</Label>');
r('>资产类型</Label>', '>{td("assetTypeLabel")}</Label>');
r('>布局类型</Label>', '>{td("layoutType")}</Label>');
r('<SelectItem value="single_row">单排</SelectItem>', '<SelectItem value="single_row">{td("singleRow")}</SelectItem>');
r('<SelectItem value="multi_row">多排</SelectItem>', '<SelectItem value="multi_row">{td("multiRow")}</SelectItem>');
r('>单次出件数</Label>', '>{td("piecesPerImpression")}</Label>');
r('placeholder="如 300x200mm"', 'placeholder={td("specPlaceholder")}');
r('>材质</Label>', '>{td("material")}</Label>');
r('placeholder="材质"', 'placeholder={td("materialPlaceholder")}');
r('>寿命参数</h4>', '>{td("lifeParams")}</h4>');
r('>最大使用次数</Label>', '>{td("maxUsage")}</Label>');
r('placeholder="如 50000"', 'placeholder={td("maxUsagePlaceholder")}');
r('>已使用次数</Label>', '>{td("usedCount")}</Label>');
r('placeholder="0"', 'placeholder={td("usedCountPlaceholder")}');
r('>预警比例(%)</Label>', '>{td("warningThreshold")}</Label>');
r('placeholder="80"', 'placeholder={td("warningThresholdPlaceholder")}');
r('>保养参数</h4>', '>{td("maintenanceParams")}</h4>');
r('>保养间隔次数</Label>', '>{td("maintenanceInterval")}</Label>');
r('placeholder="8000"', 'placeholder={td("maintenanceIntervalPlaceholder")}');
r('>单价(元)</Label>', '>{td("unitPrice")}</Label>');
r('placeholder="0"', 'placeholder={td("unitPricePlaceholder")}');
r('>存放位置</Label>', '>{td("storageLocationLabel")}</Label>');
r('placeholder="A区-01架"', 'placeholder={td("storagePlaceholder")}');
r('placeholder="备注信息"', 'placeholder={td("remarkPlaceholder")}');

// 18. Dialog buttons
r('>取消</Button>', '>{tc("cancel")}</Button>');
r("{editing ? tc('save') : '创建'}", '{editing ? tc("save") : td("create")}');

// 19. Usage dialog
r('<DialogTitle>记录使用</DialogTitle>', '<DialogTitle>{td("recordUsageTitle")}</DialogTitle>');
r('>当前累计</span>', '>{td("currentCumulative")}</span>');
r('>使用率</span>', '>{td("usageRateLabel")}</span>');
r('>生命周期</span>', '>{td("lifeCycleLabel")}</span>');
r('>本次使用次数', '>{td("thisUsageCount")}');
r('placeholder="输入使用次数"', 'placeholder={td("thisUsageCountPlaceholder")}');
r('>确认记录</Button>', '>{td("confirmRecord")}</Button>');

// 20. Maintenance dialog
r('<DialogTitle>创建保养记录</DialogTitle>', '<DialogTitle>{td("createMaintenanceRecord")}</DialogTitle>');
r('>累计使用</span>', '>{td("cumulativeUsage")}</span>');
r('>已保养次数</span>', '>{td("maintenanceCount")}</span>');
r('>距上次保养</span>', '>{td("sinceLastMaintenance")}</span>');
r('次</span>', '{td("times")}</span>');
r('>保养类型', '>{td("maintenanceType")}');
r('<SelectItem value="routine">常规保养</SelectItem>', '<SelectItem value="routine">{td("routineMaintenance")}</SelectItem>');
r('<SelectItem value="grinding">磨刃/修版</SelectItem>', '<SelectItem value="grinding">{td("grinding")}</SelectItem>');
r('<SelectItem value="re_rule">重做/翻新</SelectItem>', '<SelectItem value="re_rule">{td("reRule")}</SelectItem>');
r('<SelectItem value="replace">更换</SelectItem>', '<SelectItem value="replace">{td("replace")}</SelectItem>');
r('>保养费用(元)</Label>', '>{td("maintenanceCost")}</Label>');
r('>保养人员</Label>', '>{td("maintenancePerson")}</Label>');
r('placeholder="保养人员姓名"', 'placeholder={td("maintenancePersonName")}');
r('placeholder="保养备注"', 'placeholder={td("maintenanceRemark")}');
r('>立即完成保养</Label>', '>{td("completeImmediately")}</Label>');
r('>创建保养</Button>', '>{td("createMaintenance")}</Button>');

// 21. Detail dialog
r('<DialogTitle>刀模/网版详情</DialogTitle>', '<DialogTitle>{td("dieTemplateDetail")}</DialogTitle>');
r('>寿命信息</h4>', '>{td("lifeInfo")}</h4>');
r('>保养信息</h4>', '>{td("maintenanceInfo")}</h4>');
r('>间隔：</span>', '>{td("maintenanceIntervalLabel")}：</span>');
r('>上次保养：</span>', '>{td("lastMaintenance")}：</span>');
r('>最后使用：</span>', '>{td("lastUsed")}：</span>');
r('>保养进度</span>', '>{td("maintenanceProgressLabel")}</span>');
r('>单价：</span>', '>{td("unitPriceLabel")}：</span>');
r('>存放位置：</span>', '>{td("storageLocation")}：</span>');
r('>购买日期：</span>', '>{td("purchaseDate")}：</span>');
r('>二维码：</span>', '>{td("qrCode")}：</span>');
r('>备注：</span>', '>{td("detailRemark")}：</span>');
r("'多排' : '单排'", 'td("layoutMulti") : td("layoutSingle")');

// 22. Status card dialog buttons
r('>关闭</Button>', '>{td("close")}</Button>');
r('>详情</Button>', '>{td("detail")}</Button>');
r('>重做</Button>', '>{td("redo")}</Button>');
r('>保养</Button>', '>{td("maintenance")}</Button>');

// 23. Confirm messages
r('确定完成此保养？', 'td("confirmCompleteMaintenance")');
r('确定报废此模板？报废后不可恢复！', 'td("confirmScrap")');
r('确定删除此记录？', 'td("confirmDelete")');

// 24. Toast messages
r('获取刀模/网版列表失败', 'td("fetchListFailed")');
r('获取保养记录失败', 'td("fetchMaintenanceFailed")');
r('获取使用记录失败', 'td("fetchUsageFailed")');
r('请填写编号和名称', 'td("fillCodeAndName")');
r('创建成功', 'td("createSuccess")');
r("'创建失败'", 'td("createFailed")');
r('更新成功', 'td("updateSuccess")');
r("'更新失败'", 'td("updateFailed")');
r('请输入使用次数', 'td("inputUsageCount")');
r('使用次数必须大于0', 'td("usageCountMustGreaterThan0")');
r('`已记录${deductCount}次使用，累计${data.data?.cumulative_after || 0}次`', 'td("recordSuccess", {count: deductCount, cumulative: data.data?.cumulative_after || 0})');
r("'记录失败'", 'td("recordFailed")');
r('保养记录创建成功', 'td("maintenanceRecordCreated")');
r("'保养创建失败'", 'td("maintenanceCreateFailed")');
r('保养完成', 'td("maintenanceCompleted")');
r('`${action}成功`', 'td(item.status === 3 ? "unlockSuccess" : "lockSuccess")');
r('`${action}失败`', 'td(item.status === 3 ? "unlockFailed" : "lockFailed")');
r('报废成功', 'td("scrapSuccess")');
r("'报废失败'", 'td("scrapFailed")');
r('删除成功', 'td("deleteSuccess")');
r("'删除失败'", 'td("deleteFailed")');

// 25. getStatusCardTitle
r("return '可用刀模/网版';", 'return td("availableDieTemplates");');
r("return '需保养刀模/网版';", 'return td("maintenanceNeededDieTemplates");');
r("return '需重做刀模/网版';", 'return td("reRuleNeededDieTemplates");');
r("return '已报废刀模/网版';", 'return td("scrapDieTemplates");');
r("return '待保养刀模/网版';", 'return td("maintenanceDueDieTemplates");');
r("return '全部刀模/网版';", 'return td("allDieTemplates");');

// 26. DialogDescription for status card
r('共 {statusCardList.length} 条记录', 'td("totalRecords", {count: statusCardList.length})');

fs.writeFileSync(fp, c, 'utf8');
console.log('Done');
