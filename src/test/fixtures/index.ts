/**
 * 测试数据工厂入口
 * 集中导出所有fixtures，方便测试使用
 */

export * from './users'
export * from './configs'

/**
 * 通用工厂函数类型
 */
export type Factory<T> = (overrides?: Partial<T>) => T

/**
 * 创建列表工厂
 */
export function createList<T>(factory: Factory<T>, count: number, overrides?: Partial<T>): T[] {
  return Array.from({ length: count }, (_, index) =>
    factory({
      id: index + 1,
      ...overrides,
    })
  )
}