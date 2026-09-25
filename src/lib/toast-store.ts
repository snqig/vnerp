/**
 * 全局 toast 单例存储（唯一渲染来源）。
 *
 * 背景：项目里并存两套 toast 调用 API ——
 *   · `useToast()`        `@/hooks/use-toast`      （84 个文件 / 770+ 处调用）
 *   · `useToastContext()` `@/components/ui/toast`  （6 个文件）
 * 二者此前各自持有状态，而**唯一的渲染点** `ToastViewport` 只读 context，
 * 于是占绝大多数的 `useToast()` 提示无人渲染、静默丢失（用户观感：「点了没反应」）。
 *
 * 现在两条 API 统一写入本 store，由挂在 `src/app/[locale]/layout.tsx` 的
 * `ToastViewport` 渲染 —— 一处收口，两套 API 都可见。
 *
 * 注意：`getSnapshot` 必须返回**稳定引用**（仅在变更时替换数组），
 * 否则 `useSyncExternalStore` 会因每次拿到新引用而无限重渲染。
 */

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type Listener = () => void;

/** 全局单例状态；初始值是一个稳定的空数组实例 */
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

/** 渲染侧自动消失时长（与 useToast 的本地 3000ms 相互独立） */
const TTL_MS = 5000;

function emit() {
  listeners.forEach((l) => l());
}

export const toastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): ToastItem[] {
    return toasts;
  },

  /** 投递一条 toast；可传入既有 id（让调用方自己的 dismiss 也能命中） */
  add(item: Omit<ToastItem, 'id'>, id?: string): string {
    const finalId = id || Math.random().toString(36).substring(2, 9);
    toasts = [...toasts, { ...item, id: finalId }];
    emit();
    setTimeout(() => toastStore.remove(finalId), TTL_MS);
    return finalId;
  },

  remove(id: string) {
    const next = toasts.filter((t) => t.id !== id);
    if (next.length === toasts.length) return;
    toasts = next;
    emit();
  },

  /** 仅供测试/紧急清理使用 */
  reset() {
    toasts = [];
    emit();
  },
};
