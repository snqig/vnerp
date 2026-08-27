// 网版（screen-plate）的唯一实现位于 /api/screen-plates（见 ../../screen-plates/route.ts）。
// 本文件为兼容别名，避免与 screen-plates 出现两套并行实现导致维护混乱。
// 前端实际调用 /api/screen-plates（camelCase 字段、含 screen_plate_history 写入）。
export { GET, POST, PUT, DELETE } from '@/app/api/screen-plates/route';
