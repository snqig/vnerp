/**
 * 同步翻译助手（server-only）。
 *
 * 用途：供「非组件 / 非 async 渲染上下文」使用——同步函数、类方法、模块顶层。
 * 这些地方既不能调 React hook 版的 useTranslations（会抛 "not callable within an async component"），
 * 也不能用 getTranslations（需要 await，而同步上下文没有 await）。
 *
 * 实现：直接从 zh-CN 的 Common 命名空间读取文案，返回字符串。不依赖 React / 请求 locale。
 * 仅用于服务端日志与错误信息；需要按请求 locale 本地化的用户面向消息，请用 next-intl 的 getTranslations（异步）。
 */
import commonMessages from '../../messages/zh-CN.json';

type MessageMap = Record<string, string>;
const common = ((commonMessages as { Common?: MessageMap }).Common ?? {}) as MessageMap;

export function t(key: string): string {
  return common[key] ?? key;
}
