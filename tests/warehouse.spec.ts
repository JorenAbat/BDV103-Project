import { describe, it, expect } from 'vitest';
import { setupApiTests } from './test-helper.js';

setupApiTests();

describe('Warehouse API', () => {
  it('should return quantity 0 for a non-existent book', async () => {
    const testContext = (globalThis as unknown as { testContext: { address: string } }).testContext;
    const res = await fetch(`${testContext.address}/warehouse/non-existent-book`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ quantity: 0 });
  });
}); 