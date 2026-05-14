# 插件与二次开发指引

## 1. 插件化入口（如何扩展业务/功能模块）

- **模块扩展**  
  如需增加新业务模块（如报表、自定义表单），直接在 `src/app/[your_module]/` 目录建立业务页面，API路由建议按 REST 规范建于 `src/app/api/[your_module]`。

- **领域服务扩展**  
  在 `src/domain/[your_domain]/` 增加聚合根、实体、值对象、Repo接口即可，业务规则按 DDD 结构组织。

- **组件/界面复用**
  通用UI组件统一放在 `src/components/ui/`，特殊业务组件于 `src/components/common/`，建议复用 Tailwind+shadcn 体系。

## 2. 插件开发/动态加载机制

- 参考 `src/components.json` 中组件动态注册方式，自定义组件完成注册后即可自动在业务界面可用。
- 如需实现“自定义表单/审批流程/可插拔报表”，可仿照现有模块动态加载方式：

```json
{
  "plugins": [
    { "name": "custom-report", "entry": "./src/plugins/custom-report/index.tsx" },
    { "name": "workflow", "entry": "./src/plugins/workflow/index.tsx" }
  ]
}
```

- 插件入口建议统一在 `src/plugins/` 目录，并以 `entry` 字段对接主路由或菜单。

## 3. API/Webhooks 扩展

- 新增外部系统交互建议采用 Webhook 标准，统一在 `src/app/api/webhooks/` 下实现 POST/GET，外部只需注册 URL 即可集成第三方平台。

## 4. 自动化部署/DevOps 建议

- 建议 fork 时保留 `.github/workflows/` 自动化CI/CD流程。
- 生产部署可直接云端Runner推送，支持Docker或Serverless部署可行性（可补充一键部署脚本）。

## 5. 文档协作建议

- 所有新功能建议先补充到 `docs/Wiki/`，便于主分支维护与社区协作。