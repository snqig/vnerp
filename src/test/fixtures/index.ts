export * from './users'
export * from './configs'

export type Factory<T> = (overrides?: Partial<T> & Record<string, any>) => T

export function createList<T>(factory: Factory<T>, count: number, overrides?: Partial<T> & Record<string, any>): T[] {
  return Array.from({ length: count }, (_, index) =>
    factory({
      id: index + 1,
      ...overrides,
    } as unknown as Partial<T> & Record<string, any>)
  )
}
