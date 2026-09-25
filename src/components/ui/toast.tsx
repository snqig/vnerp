'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { toastStore, type ToastItem } from '@/lib/toast-store';

/**
 * Toast 渲染管线。
 *
 * 状态源统一为 `@/lib/toast-store` 的全局单例：
 *   · `useToastContext()`（本文件，6 个文件在用）
 *   · `useToast()`（`@/hooks/use-toast`，84 个文件在用）
 * 都写入同一个 store，因此**任一路径投递的提示都会在这里被渲染**。
 *
 * 历史缺陷：本组件此前读的是 `React.useState` 局部状态，而 `useToast()` 写的是
 * 另一份局部状态 → 占绝大多数的提示无人渲染。现收敛到单一来源。
 */
const ToastContext = React.createContext<{
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>, id?: string) => string;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
});

export function ToastProviderComponent({ children }: { children: React.ReactNode }) {
  const toasts = React.useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getSnapshot
  );

  const value = React.useMemo(
    () => ({
      toasts,
      addToast: (toast: Omit<ToastItem, 'id'>, id?: string) => toastStore.add(toast, id),
      removeToast: (id: string) => toastStore.remove(id),
    }),
    [toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export const useToastContext = () => React.useContext(ToastContext);

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function ToastViewport() {
  const { toasts, removeToast } = useToastContext();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn(toastVariants({ variant: toast.variant }))}>
          <div className="grid gap-1">
            {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
            {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export { toastVariants };
