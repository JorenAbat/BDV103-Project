import { describe, it, expect } from 'vitest';
import { setupApiTests } from './test-helper.js';

setupApiTests();

type OrderResponse = {
  orderId: string;
  status: string;
  createdAt: string;
};

describe('Orders API', () => {
  it('should create an order for an existing book', async () => {
    const testContext = (globalThis as unknown as { testContext: { address: string } }).testContext;
    // Add a book to the warehouse first
    const addRes = await fetch(`${testContext.address}/warehouse/add-books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: 'test-book-1', shelfId: 'shelf-1', quantity: 5 })
    });
    expect(addRes.status).toBe(200);
    // Now create an order for that book
    const orderRes = await fetch(`${testContext.address}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ bookId: 'test-book-1', quantity: 2 }] })
    });
    expect(orderRes.status).toBe(200);
    const order = await orderRes.json() as OrderResponse;
    expect(order).toHaveProperty('orderId');
    expect(order.status).toBe('pending');
    expect(order.createdAt).toBeDefined();
  });
}); 