const fs = require('fs');
const fp = 'd:/dcprint/erp-project/src/app/[locale]/prepress/die-template/page.tsx';
let c = fs.readFileSync(fp, 'utf8');

function r(oldStr, newStr) {
  const orig = c;
  c = c.split(oldStr).join(newStr);
  if (c !== orig) console.log('Replaced: ' + oldStr.substring(0,60));
}

// Warning table action buttons - exact match with whitespace
r('                            <Wrench className="h-3 w-3 mr-1" />\n                            保养\n                          </Button>', '                            <Wrench className="h-3 w-3 mr-1" />\n                            {td("maintenance")}\n                          </Button>');
r('                            <Activity className="h-3 w-3 mr-1" />\n                            记录\n                          </Button>', '                            <Activity className="h-3 w-3 mr-1" />\n                            {td("recordUsage")}\n                          </Button>');

// Refresh button in list tab
r('                  <RefreshCw className="h-4 w-4 mr-2" />\n                  刷新\n                </Button>', '                  <RefreshCw className="h-4 w-4 mr-2" />\n                  {td("refresh")}\n                </Button>');

// Add button
r('                  <Plus className="h-4 w-4 mr-2" />\n                  新增\n                </Button>', '                  <Plus className="h-4 w-4 mr-2" />\n                  {td("add")}\n                </Button>');

// Sort headers
r('                        编号{getSortIcon(\'template_code\')}', '                        {td("code")}{getSortIcon(\'template_code\')}');
r('                        名称{getSortIcon(\'template_name\')}', '                        {td("name")}{getSortIcon(\'template_name\')}');

// Maintenance tab refresh
r('                    <RefreshCw className="h-4 w-4 mr-2" />\n                    刷新\n                  </Button>', '                    <RefreshCw className="h-4 w-4 mr-2" />\n                    {td("refresh")}\n                  </Button>');

// Usage tab refresh
r('                    <RefreshCw className="h-4 w-4 mr-2" />\n                    刷新\n                  </Button>', '                    <RefreshCw className="h-4 w-4 mr-2" />\n                    {td("refresh")}\n                  </Button>');

// Dialog form labels with red star
r('                  <Label>\n                    编号 <span className="text-red-500">*</span>\n                  </Label>', '                  <Label>\n                    {td("codeRequired")} <span className="text-red-500">*</span>\n                  </Label>');
r('                  <Label>\n                    名称 <span className="text-red-500">*</span>\n                  </Label>', '                  <Label>\n                    {td("nameRequired")} <span className="text-red-500">*</span>\n                  </Label>');

// Section headers
r('                  寿命参数\n                </h4>', '                  {td("lifeParams")}\n                </h4>');
r('                  保养参数\n                </h4>', '                  {td("maintenanceParams")}\n                </h4>');

// Dialog cancel buttons
r('              <Button variant="outline" onClick={() => setDialogOpen(false)}>\n                取消\n              </Button>', '              <Button variant="outline" onClick={() => setDialogOpen(false)}>\n                {tc("cancel")}\n              </Button>');

// Usage dialog
r('                <Label>\n                  本次使用次数 <span className="text-red-500">*</span>\n                </Label>', '                <Label>\n                  {td("thisUsageCount")} <span className="text-red-500">*</span>\n                </Label>');
r('              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>\n                取消\n              </Button>', '              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>\n                {tc("cancel")}\n              </Button>');
r('              <Button onClick={handleDeductUsage} className="bg-blue-600 hover:bg-blue-700">\n                确认记录\n              </Button>', '              <Button onClick={handleDeductUsage} className="bg-blue-600 hover:bg-blue-700">\n                {td("confirmRecord")}\n              </Button>');

// Maintenance dialog - "次" after since last maintenance
r('                      次\n                    </span>\n                  </div>\n                </div>\n              )}\n              <div className="space-y-2">\n                <Label>\n                  保养类型', '                      {td("times")}\n                    </span>\n                  </div>\n                </div>\n              )}\n              <div className="space-y-2">\n                <Label>\n                  {td("maintenanceType")}');

r(' <span className="text-red-500">*</span>\n                </Label>\n                <Select', ' <span className="text-red-500">*</span>\n                </Label>\n                <Select');

// Maintenance dialog complete immediately
r('                <Label htmlFor="complete_immediately" className="text-sm">\n                  立即完成保养\n                </Label>', '                <Label htmlFor="complete_immediately" className="text-sm">\n                  {td("completeImmediately")}\n                </Label>');

// Maintenance dialog buttons
r('              <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>\n                取消\n              </Button>', '              <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>\n                {tc("cancel")}\n              </Button>');
r('              <Button onClick={handleMaintenance} className="bg-blue-600 hover:bg-blue-700">\n                创建保养\n              </Button>', '              <Button onClick={handleMaintenance} className="bg-blue-600 hover:bg-blue-700">\n                {td("createMaintenance")}\n              </Button>');

// Detail dialog counts
r('                      {detailData.max_impressions || detailData.max_usage} 次\n                    </div>', '                      {detailData.max_impressions || detailData.max_usage} {td("times")}\n                    </div>');
r('                      {detailData.maintenance_count || 0}次\n                    </div>', '                      {detailData.maintenance_count || 0}{td("times")}\n                    </div>');
r('                      {detailData.maintenance_interval || \'-\'}次\n                    </div>', '                      {detailData.maintenance_interval || \'-\'}{td("times")}\n                    </div>');

// Status card dialog buttons
r('                              <Wrench className="h-3 w-3 mr-1" />\n                              保养\n                            </Button>', '                              <Wrench className="h-3 w-3 mr-1" />\n                              {td("maintenance")}\n                            </Button>');
r('                              <RotateCcw className="h-3 w-3 mr-1" />\n                              重做\n                            </Button>', '                              <RotateCcw className="h-3 w-3 mr-1" />\n                              {td("redo")}\n                            </Button>');
r('                            <Eye className="h-3 w-3 mr-1" />\n                            详情\n                          </Button>', '                            <Eye className="h-3 w-3 mr-1" />\n                            {td("detail")}\n                          </Button>');
r('              <Button variant="outline" onClick={() => setStatusCardDialogOpen(false)}>\n                关闭\n              </Button>', '              <Button variant="outline" onClick={() => setStatusCardDialogOpen(false)}>\n                {td("close")}\n              </Button>');

fs.writeFileSync(fp, c, 'utf8');
console.log('Fix3 done');
