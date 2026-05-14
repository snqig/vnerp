演示数据填充(seeding)说明
目的
一键生成常用角色、Demo用户、客户、仓库、物料等演示业务对象。
支持开发演示环境/沙箱环境快速复原。
操作方法
编辑数据库连接配置，确保本地/沙箱MySQL运行正常。
执行脚本生成基础种子数据：
pnpm run seed
# 或
node database/seeds/seed.js
登录Demo账户：
CEO账号：demo_ceo / 123456
仓库主管：demo_warehouse / 123456
成功后可直接访问系统各大功能进行演示，无需手工录入。