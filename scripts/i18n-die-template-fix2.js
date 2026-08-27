const fs = require('fs');
const fp = 'd:/dcprint/erp-project/src/app/[locale]/prepress/die-template/page.tsx';
let c = fs.readFileSync(fp, 'utf8');

function r(oldStr, newStr) {
  const orig = c;
  c = c.split(oldStr).join(newStr);
  if (c !== orig) console.log('Replaced: ' + oldStr.substring(0,60));
}

// Warning action buttons text content
r('>保养\n                          </Button>', '>{td("maintenance")}\n                          </Button>');
r('>记录\n                          </Button>', '>{td("recordUsage")}\n                          </Button>');

// Refresh buttons that were missed (need more context)
r('<RefreshCw className="h-4 w-4 mr-2" />\n                  刷新\n                </Button>', '<RefreshCw className="h-4 w-4 mr-2" />\n                  {td("refresh")}\n                </Button>');

// Add button
r('<Plus className="h-4 w-4 mr-2" />\n                  新增\n                </Button>', '<Plus className="h-4 w-4 mr-2" />\n                  {td("add")}\n                </Button>');

// Sort headers with Chinese inside span
r('>编号{getSortIcon', '>{td("code")}{getSortIcon');
r('>名称{getSortIcon', '>{td("name")}{getSortIcon');

// Maintenance tab refresh
r('<RefreshCw className="h-4 w-4 mr-2" />\n                    刷新\n                  </Button>', '<RefreshCw className="h-4 w-4 mr-2" />\n                    {td("refresh")}\n                  </Button>');

// Usage tab refresh
r('<RefreshCw className="h-4 w-4 mr-2" />\n                    刷新\n                  </Button>', '<RefreshCw className="h-4 w-4 mr-2" />\n                    {td("refresh")}\n                  </Button>');

// Dialog form labels with red star
r('>编号 <span className="text-red-500">*</span>', '>{td("codeRequired")} <span className="text-red-500">*</span>');
r('>名称 <span className="text-red-500">*</span>', '>{td("nameRequired")} <span className="text-red-500">*</span>');

// Section headers
r('>寿命参数</h4>', '>{td("lifeParams")}</h4>');
r('>保养参数</h4>', '>{td("maintenanceParams")}</h4>');

// Dialog cancel buttons
r('>取消</Button>', '>{tc("cancel")}</Button>');

// Usage dialog
r('>本次使用次数 <span className="text-red-500">*</span>', '>{td("thisUsageCount")} <span className="text-red-500">*</span>');
r('>确认记录</Button>', '>{td("confirmRecord")}</Button>');

// Maintenance dialog
r('次\n                  </div>', '{td("times")}\n                  </div>');
r('>保养类型 <span className="text-red-500">*</span>', '>{td("maintenanceType")} <span className="text-red-500">*</span>');
r('>立即完成保养</Label>', '>{td("completeImmediately")}</Label>');
r('>创建保养</Button>', '>{td("createMaintenance")}</Button>');

// Detail dialog counts
r(' 次</div>', ' {td("times")}</div>');
r('次</div>', '{td("times")}</div>'); // maintenance count
r('次</div>', '{td("times")}</div>'); // interval

// Status card dialog buttons
r('>保养\n                            </Button>', '>{td("maintenance")}\n                            </Button>');
r('>重做\n                            </Button>', '>{td("redo")}\n                            </Button>');
r('>详情\n                          </Button>', '>{td("detail")}\n                          </Button>');
r('>关闭\n              </Button>', '>{td("close")}\n              </Button>');

fs.writeFileSync(fp, c, 'utf8');
console.log('Fix2 done');
