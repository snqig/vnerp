'use client';

import { useState, useCallback } from 'react';
import { toastStore } from '@/lib/toast-store';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * 全站统一 toast API（客户端）。
 *
 * ⚠️ 历史缺陷：这里曾是「纯局部 state」—— `toast()` 只写入调用组件自己的
 * `useState`，而**没有任何组件渲染它**，于是全站 770+ 处提示静默失效
 * （用户观感：「点了保存完全没反应」）。
 *
 * 修复策略（保持向后兼容，不破坏既有契约）：
 *   1. 保留原有的局部 state 与返回值语义（`toast()` 仍返回 id、3000ms 本地自动移除），
 *      使既有调用点与单测 `use-toast.test.ts` 完全不受影响；
 *   2. **额外**把同一条消息投递到全局 `toastStore`（`@/lib/toast-store`），
 *      由挂在 layout 的 `ToastViewport` 渲染 —— 这才是用户看得见的那一份；
 *   3. `dismiss(id)` 同时清理本地与全局，行为一致。
 *
 * 需要订阅「渲染态」的新代码，请直接用 `toastStore` 或 `useToastContext()`。
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
    };

    setToasts((prev) => [...prev, newToast]);

    // 投递到全局 store（复用同一个 id，使 dismiss 双向命中）
    toastStore.add(
      {
        title: newToast.title,
        description: newToast.description,
        variant: newToast.variant,
      },
      id
    );

    // 本地态自动移除（保留原 3000ms 语义；全局那份由 store 的 TTL 管理）
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    toastStore.remove(id);
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
