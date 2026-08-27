#!/usr/bin/env node
/**
 * 从 src/app/[locale]/ 目录结构生成所有页面路由
 */
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

function getRoutes(dir, basePath = '', routes = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // 跳过动态路由中的 [id] 等参数（只保留 [locale] 下的静态路由）
      if (entry.startsWith('[') && entry !== '[locale]') continue;
      const routePath = basePath + '/' + entry;
      getRoutes(fullPath, routePath, routes);
    } else if (entry === 'page.tsx') {
      // 将 \ 转换为 /
      let route = basePath.replace(/\\/g, '/');
      // 去掉 [locale] 前缀
      route = route.replace(/^\[locale\]/, '');
      if (route === '') route = '/';
      routes.push(route);
    }
  }
  return routes;
}

const routes = getRoutes('src/app/[locale]');
routes.sort();

// 输出路由列表
console.log(JSON.stringify(routes, null, 2));
console.error(`\nTotal routes: ${routes.length}`, );
