'use client';

import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f7fa' }}>
          <FileQuestion className="w-6 h-6" style={{ color: '#86909c' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#1f2329' }}>页面不存在</h2>
          <p className="text-sm" style={{ color: '#86909c' }}>您访问的页面可能已被移动或删除</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md no-underline"
          style={{ backgroundColor: '#1677ff' }}
        >
          <Home className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
