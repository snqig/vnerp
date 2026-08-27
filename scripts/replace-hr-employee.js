const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/[locale]/hr/employee/page.tsx');
let c = fs.readFileSync(pagePath, 'utf8');

// 确保有 useTranslations 导入
if (!c.includes("import { useTranslations } from 'next-intl';")) {
  c = c.replace(
    "import { useCompanyName } from '@/hooks/useCompanyName';",
    "import { useCompanyName } from '@/hooks/useCompanyName';\nimport { useTranslations } from 'next-intl';"
  );
}

// 确保有翻译钩子
if (!c.includes("const t = useTranslations('Hr');")) {
  c = c.replace(
    "const { companyName } = useCompanyName();",
    "const t = useTranslations('Hr');\n  const tc = useTranslations('Common');\n  const { companyName } = useCompanyName();"
  );
}

// 替换函数
function r(oldStr, newStr) {
  const original = c;
  c = c.split(oldStr).join(newStr);
  if (c === original) {
    console.warn(`⚠️ 未替换: ${oldStr.substring(0, 50)}...`);
  }
}

// 页面标题和描述
r('title="员工档案"', 'title={t("employeeProfile")}');
r('<CardDescription>管理企业员工信息和组织架构</CardDescription>', '<CardDescription>{t("manageEmployeeInfo")}</CardDescription>');
r('<CardTitle className="flex items-center gap-2">\n                <UserCircle className="w-5 h-5" />\n                员工档案\n              </CardTitle>', '<CardTitle className="flex items-center gap-2">\n                <UserCircle className="w-5 h-5" />\n                {t("employeeProfile")}\n              </CardTitle>');

// 按钮
r('<Plus className="w-4 h-4 mr-2" />\n              新增员工', '<Plus className="w-4 h-4 mr-2" />\n              {t("addEmployee")}');
r('placeholder="搜索员工姓名、编号、手机号..."', 'placeholder={t("searchPlaceholder")}');
r('<RefreshCw className="w-4 h-4 mr-2" />\n                刷新', '<RefreshCw className="w-4 h-4 mr-2" />\n                {t("refresh")}');
r('<Printer className="w-4 h-4 mr-2" />\n                打印', '<Printer className="w-4 h-4 mr-2" />\n                {t("print")}');
r('<FileSpreadsheet className="w-4 h-4 mr-2" />\n                导出Excel', '<FileSpreadsheet className="w-4 h-4 mr-2" />\n                {t("exportExcel")}');
r('<FileText className="w-4 h-4 mr-2" />\n                导出PDF', '<FileText className="w-4 h-4 mr-2" />\n                {t("exportPDF")}');

// 统计面板
r('<p className="text-sm text-blue-600 font-medium">总人数</p>', '<p className="text-sm text-blue-600 font-medium">{t("totalCount")}</p>');
r('<p className="text-sm text-green-600 font-medium">男性</p>', '<p className="text-sm text-green-600 font-medium">{t("male")}</p>');
r('<p className="text-sm text-pink-600 font-medium">女性</p>', '<p className="text-sm text-pink-600 font-medium">{t("female")}</p>');
r('<p className="text-sm text-purple-600 font-medium">平均年龄</p>', '<p className="text-sm text-purple-600 font-medium">{t("avgAge")}</p>');
r('<p className="text-xs text-purple-500">岁</p>', '<p className="text-xs text-purple-500">{t("ageUnit")}</p>');
r('男\n                    </div>', '{t("maleShort")}\n                    </div>');
r('女\n                    </div>', '{t("femaleShort")}\n                    </div>');

// 学历分布
r('<CardTitle className="text-sm font-medium flex items-center gap-2">\n                  <GraduationCap className="w-4 h-4" />\n                  学历分布\n                </CardTitle>', '<CardTitle className="text-sm font-medium flex items-center gap-2">\n                  <GraduationCap className="w-4 h-4" />\n                  {t("educationDistribution")}\n                </CardTitle>');
r('{edu}: {count}人', '{edu}: {count}{t("ageUnit")}');

// 选择提示
r('已选择 {selectedEmployees.length} 名员工', '{t("selectedCount", { count: selectedEmployees.length })}');
r('<Printer className="w-4 h-4 mr-2" />\n                      批量打印上岗证', '<Printer className="w-4 h-4 mr-2" />\n                      {t("batchPrintCard")}');
r('清除选择', '{t("clearSelection")}');

// 表头
r('序号\n                          {sortConfig.key === \'id\'', '{t("serialNo")}\n                          {sortConfig.key === \'id\'');
r('员工编号\n                          {sortConfig.key === \'employee_no\'', '{t("employeeNo")}\n                          {sortConfig.key === \'employee_no\'');
r('姓名\n                          {sortConfig.key === \'name\'', '{t("name")}\n                          {sortConfig.key === \'name\'');
r('性别\n                          {sortConfig.key === \'gender\'', '{t("gender")}\n                          {sortConfig.key === \'gender\'');
r('年龄\n                          {sortConfig.key === \'age\'', '{t("age")}\n                          {sortConfig.key === \'age\'');
r('部门\n                          {sortConfig.key === \'dept_name\'', '{t("department")}\n                          {sortConfig.key === \'dept_name\'');
r('课室\n                          {sortConfig.key === \'section\'', '{t("section")}\n                          {sortConfig.key === \'section\'');
r('职位\n                          {sortConfig.key === \'position\'', '{t("position")}\n                          {sortConfig.key === \'position\'');
r('入职日期\n                          {sortConfig.key === \'entry_date\'', '{t("entryDate")}\n                          {sortConfig.key === \'entry_date\'');
r('学历\n                          {sortConfig.key === \'education\'', '{t("education")}\n                          {sortConfig.key === \'education\'');
r('籍贯\n                          {sortConfig.key === \'native_place\'', '{t("nativePlace")}\n                          {sortConfig.key === \'native_place\'');
r('联系方式\n                          {sortConfig.key === \'phone\'', '{t("contact")}\n                          {sortConfig.key === \'phone\'');
r('状态\n                          {sortConfig.key === \'status\'', '{t("status")}\n                          {sortConfig.key === \'status\'');
r('操作</TableHead>', '{t("operation")}</TableHead>');
r('<TableHead>照片</TableHead>', '<TableHead>{t("photo")}</TableHead>');

// 表格内容
r("{emp.gender === 1 ? '男' : '女'}", '{emp.gender === 1 ? t("maleShort") : t("femaleShort")}');
r("title=\"打印上岗证\"", 'title={t("printCard")}');

// 对话框标题
r('<DialogTitle>{editing ? \'编辑员工\' : \'新增员工\'}</DialogTitle>', '<DialogTitle>{editing ? t("editEmployee") : t("addEmployeeTitle")}</DialogTitle>');
r('<DialogDescription>{editing ? \'修改员工信息\' : \'填写新员工信息\'}</DialogDescription>', '<DialogDescription>{editing ? t("editEmployeeDesc") : t("addEmployeeDesc")}</DialogDescription>');

// 表单标签
r('<Label className="mb-2 block">员工照片</Label>', '<Label className="mb-2 block">{t("employeePhoto")}</Label>');
r('<span className="text-sm text-gray-500">点击上传照片</span>', '<span className="text-sm text-gray-500">{t("uploadPhoto")}</span>');
r('<span className="text-xs text-gray-400">支持 JPG、PNG</span>', '<span className="text-xs text-gray-400">{t("supportJpgPng")}</span>');
r('placeholder="系统自动生成"', 'placeholder={t("autoGenerate")}');
r('<Label>\n                姓名 <span className="text-red-500">*</span>\n              </Label>', '<Label>\n                {t("name")} <span className="text-red-500">*</span>\n              </Label>');
r('placeholder="请输入姓名"', 'placeholder={t("enterName")}');
r('<Label>\n                性别 <span className="text-gray-400 text-xs">(身份证自动识别)</span>\n              </Label>', '<Label>\n                {t("gender")} <span className="text-gray-400 text-xs">{t("idCardAuto")}</span>\n              </Label>');
r('<SelectValue placeholder="选择性别" />', '<SelectValue placeholder={t("selectGender")} />');
r('<SelectItem value="1">男</SelectItem>', '<SelectItem value="1">{t("maleShort")}</SelectItem>');
r('<SelectItem value="2">女</SelectItem>', '<SelectItem value="2">{t("femaleShort")}</SelectItem>');
r('<Label>手机号</Label>', '<Label>{t("contact")}</Label>');
r('placeholder="请输入手机号"', 'placeholder={t("enterPhone")}');
r('<Label>邮箱</Label>', '<Label>{t("email")}</Label>');
r('placeholder="请输入邮箱"', 'placeholder={t("enterEmail")}');
r('<Label>部门</Label>', '<Label>{t("department")}</Label>');
r('<SelectValue placeholder="选择部门" />', '<SelectValue placeholder={t("selectDepartment")} />');
r('<Label>职位</Label>', '<Label>{t("position")}</Label>');
r('placeholder="请输入职位"', 'placeholder={t("enterPosition")}');
r('<Label>角色</Label>', '<Label>{t("role")}</Label>');
r('<SelectValue placeholder="选择角色" />', '<SelectValue placeholder={t("selectRole")} />');
r('<Label>入职日期</Label>', '<Label>{t("entryDate")}</Label>');
r('<Label>状态</Label>', '<Label>{t("status")}</Label>');
r('<SelectValue placeholder="选择状态" />', '<SelectValue placeholder={t("selectStatus")} />');
r('<SelectItem value="1">在职</SelectItem>', '<SelectItem value="1">{t("statusActive")}</SelectItem>');
r('<SelectItem value="2">试用期</SelectItem>', '<SelectItem value="2">{t("statusProbation")}</SelectItem>');
r('<SelectItem value="3">离职</SelectItem>', '<SelectItem value="3">{t("statusResigned")}</SelectItem>');
r('<SelectItem value="0">停用</SelectItem>', '<SelectItem value="0">{t("statusInactive")}</SelectItem>');
r('<Label>\n                年龄 <span className="text-gray-400 text-xs">(自动计算)</span>\n              </Label>', '<Label>\n                {t("age")} <span className="text-gray-400 text-xs">{t("autoCalculate")}</span>\n              </Label>');
r('placeholder="自动计算"', 'placeholder={t("autoCalculate")}');
r('<Label>课室</Label>', '<Label>{t("section")}</Label>');
r('placeholder="请输入课室"', 'placeholder={t("enterSection")}');
r('<Label>\n                出生日期 <span className="text-gray-400 text-xs">(自动计算)</span>\n              </Label>', '<Label>\n                {t("birthDate")} <span className="text-gray-400 text-xs">{t("autoCalculate")}</span>\n              </Label>');
r('<Label>身份证号</Label>', '<Label>{t("idCard")}</Label>');
r('placeholder="请输入身份证号"', 'placeholder={t("enterIdCard")}');
r('<Label>籍贯</Label>', '<Label>{t("nativePlace")}</Label>');
r('placeholder="请输入籍贯"', 'placeholder={t("enterNativePlace")}');
r('<Label>学历</Label>', '<Label>{t("education")}</Label>');
r('<SelectValue placeholder="选择学历" />', '<SelectValue placeholder={t("selectEducation")} />');
r('<SelectItem value="初中">初中</SelectItem>', '<SelectItem value="初中">{t("juniorHigh")}</SelectItem>');
r('<SelectItem value="中专">中专</SelectItem>', '<SelectItem value="中专">{t("technical")}</SelectItem>');
r('<SelectItem value="高中">高中</SelectItem>', '<SelectItem value="高中">{t("highSchool")}</SelectItem>');
r('<SelectItem value="大专">大专</SelectItem>', '<SelectItem value="大专">{t("associate")}</SelectItem>');
r('<SelectItem value="本科">本科</SelectItem>', '<SelectItem value="本科">{t("bachelor")}</SelectItem>');
r('<SelectItem value="硕士">硕士</SelectItem>', '<SelectItem value="硕士">{t("master")}</SelectItem>');
r('<SelectItem value="博士">博士</SelectItem>', '<SelectItem value="博士">{t("doctor")}</SelectItem>');
r('<Label>家庭住址</Label>', '<Label>{t("homeAddress")}</Label>');
r('placeholder="请输入家庭住址"', 'placeholder={t("enterHomeAddress")}');
r('<Label>现住址</Label>', '<Label>{t("currentAddress")}</Label>');
r('placeholder="请输入现住址"', 'placeholder={t("enterCurrentAddress")}');

// 对话框按钮
r('<Button variant="outline" onClick={() => setDialogOpen(false)}>\n              取消\n            </Button>', '<Button variant="outline" onClick={() => setDialogOpen(false)}>\n              {t("cancel")}\n            </Button>');
r('<Button onClick={saveEmployee} className="bg-blue-600 hover:bg-blue-700">\n              {editing ? \'更新\' : \'创建\'}\n            </Button>', '<Button onClick={saveEmployee} className="bg-blue-600 hover:bg-blue-700">\n              {editing ? t("update") : t("create")}\n            </Button>');

// 打印对话框
r('<DialogTitle>员工上岗证预览</DialogTitle>', '<DialogTitle>{t("cardPreview")}</DialogTitle>');
r('<DialogDescription>点击下方按钮打印上岗证</DialogDescription>', '<DialogDescription>{t("clickToPrint")}</DialogDescription>');
r('<Button variant="outline" onClick={() => setPrintDialogOpen(false)}>\n              取消\n            </Button>', '<Button variant="outline" onClick={() => setPrintDialogOpen(false)}>\n              {t("cancel")}\n            </Button>');
r('<Printer className="w-4 h-4 mr-2" />\n              打印上岗证', '<Printer className="w-4 h-4 mr-2" />\n              {t("printCard")}');

// 批量打印对话框
r('<DialogTitle>批量打印上岗证</DialogTitle>', '<DialogTitle>{t("batchPrintTitle")}</DialogTitle>');
r('<DialogDescription>共选择 {selectedEmployees.length} 名员工</DialogDescription>', '<DialogDescription>{t("batchPrintDesc", { count: selectedEmployees.length })}</DialogDescription>');
r('<Button variant="outline" onClick={() => setBatchPrintDialogOpen(false)}>\n              取消\n            </Button>', '<Button variant="outline" onClick={() => setBatchPrintDialogOpen(false)}>\n              {t("cancel")}\n            </Button>');
r('<Printer className="w-4 h-4 mr-2" />\n              打印全部', '<Printer className="w-4 h-4 mr-2" />\n              {t("printAll")}');

// Toast 消息
r("toast.error('请上传图片文件')", 'toast.error(t("uploadImageOnly"))');
r("toast.error('图片大小不能超过 2MB')", 'toast.error(t("imageSizeLimit"))');
r("toast.success('照片上传成功')", 'toast.success(t("uploadSuccess"))');
r("toast.error(result.message || '上传失败')", 'toast.error(result.message || t("uploadFailed"))');
r("toast.error('上传照片失败')", 'toast.error(t("uploadPhotoFailed"))');
r("toast.error('请输入员工姓名')", 'toast.error(t("enterEmployeeName"))');
r("toast.success(editing ? '员工更新成功' : '员工创建成功')", 'toast.success(editing ? t("updateSuccess") : t("createSuccess"))');
r("toast.error('保存员工失败')", 'toast.error(t("saveFailed"))');
r("if (!confirm('确定要删除该员工吗？')) return;", 'if (!confirm(t("deleteConfirm"))) return;');
r("toast.success('员工删除成功')", 'toast.success(t("deleteSuccess"))');
r("toast.error(result.message || '删除失败')", 'toast.error(result.message || tc("deleteFailed"))');
r("toast.error('删除员工失败')", 'toast.error(t("deleteFailed"))');
r("toast.error('没有数据可打印')", 'toast.error(t("noDataToPrint"))');
r("toast.error('无法打开打印窗口，请检查浏览器弹窗设置')", 'toast.error(t("cannotOpenPrintWindow"))');
r("toast.success(`正在打印 ${dataToPrint.length} 名员工记录`)", 'toast.success(t("printingRecords", { count: dataToPrint.length }))');
r("toast.error('请先选择要打印的员工')", 'toast.error(t("selectEmployeesFirst"))');
r("toast.error('没有数据可导出')", 'toast.error(t("noDataToExport"))');
r("toast.error('请允许弹出窗口以导出PDF')", 'toast.error(t("allowPopupPdf"))');
r("toast.success(`已导出 ${dataToExport.length} 条记录`)", 'toast.success(t("exportSuccess", { count: dataToExport.length }))');
r("toast.success(`已准备 ${dataToExport.length} 条记录的PDF`)", 'toast.success(t("preparingPdf", { count: dataToExport.length }))');
r("toast.error('请允许弹出窗口以进行打印')", 'toast.error(t("allowPopup"))');
r("toast.success('打印窗口已打开')", 'toast.success(t("printWindowOpened"))');
r("console.error('生成二维码失败:', error)", 'console.error(t("generateQRFailed"), error)');
r("toast.error('生成二维码失败')", 'toast.error(t("generateQRFailed"))');
r("console.error('获取员工列表失败:', error)", 'console.error(t("fetchEmployeesFailed"), error)');
r("toast.error('获取员工列表失败')", 'toast.error(t("fetchEmployeesFailed"))');
r("console.error('获取部门列表失败:', error)", 'console.error(t("fetchDepartmentsFailed"), error)');
r("console.error('获取角色列表失败:', error)", 'console.error(t("fetchRolesFailed"), error)');

// 状态标签
r("1: '在职'", `1: t("statusActive")`);
r("0: '停用'", `0: t("statusInactive")`);
r("2: '试用期'", `2: t("statusProbation")`);
r("3: '离职'", `3: t("statusResigned")`);

// 打印模板中的中文（保留在打印输出中，但使用翻译键）
r('<title>员工列表打印</title>', '<title>{t("employeeList")}</title>');
r('<h1>员工列表</h1>', '<h1>{t("employeeList")}</h1>');
r('打印时间', '{t("printTime")}');
r('共 {dataToPrint.length} 名员工', '{t("totalEmployees", { count: dataToPrint.length })}');
r('<th>序号</th>', '<th>{t("serialNo")}</th>');
r('<th>员工编号</th>', '<th>{t("employeeNo")}</th>');
r('<th>姓名</th>', '<th>{t("name")}</th>');
r('<th>性别</th>', '<th>{t("gender")}</th>');
r('<th>年龄</th>', '<th>{t("age")}</th>');
r('<th>部门</th>', '<th>{t("department")}</th>');
r('<th>课室</th>', '<th>{t("section")}</th>');
r('<th>职位</th>', '<th>{t("position")}</th>');
r('<th>入职日期</th>', '<th>{t("entryDate")}</th>');
r('<th>学历</th>', '<th>{t("education")}</th>');
r('<th>籍贯</th>', '<th>{t("nativePlace")}</th>');
r('<th>联系方式</th>', '<th>{t("contact")}</th>');
r('<th>状态</th>', '<th>{t("status")}</th>');

// 保存文件
fs.writeFileSync(pagePath, c, 'utf8');
console.log('✅ Page file updated!');
