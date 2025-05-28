export function sum(a: number, b: number) {
  return a + b
}

// In-source test
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('sum function', () => {
    expect(sum(1, 2)).toBe(3)
    expect(sum(0, 0)).toBe(0)
    expect(sum(-1, 1)).toBe(0)
  })
} 