import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getBookDatabase, Book } from './db.js';
import { setup, teardown } from './setup.js';
import { Collection } from 'mongodb';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createMockMessagingService } from './mock-messaging.js';

describe('Book Database Tests', () => {
  const sampleBook: Book = {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '1234567890',
    price: 29.99,
    quantity: 10,
    totalStock: 10  // Add stock information for new architecture
  };

  let books: Collection<Book>;
  let mongoInstance: MongoMemoryServer;
  let mockMessaging: ReturnType<typeof createMockMessagingService>;

  beforeAll(async () => {
    mongoInstance = await setup();
    const db = getBookDatabase();
    books = db.books;
    mockMessaging = createMockMessagingService();
    await mockMessaging.connect();
  });

  beforeEach(async () => {
    // Clear test data and mock events
    await books.deleteMany({});
    mockMessaging.clearEvents();
  });

  afterAll(async () => {
    await teardown(mongoInstance);
    await mockMessaging.disconnect();
  }, 30000);

  it('should insert and retrieve a book', async () => {
    await books.deleteMany({});
    const result = await books.insertOne(sampleBook);
    expect(result.acknowledged).toBe(true);
    const retrievedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(retrievedBook).toMatchObject(sampleBook);
  });

  it('should not find a non-existent book', async () => {
    await books.deleteMany({});
    const nonExistentBook = await books.findOne({ isbn: 'nonexistent' });
    expect(nonExistentBook).toBeNull();
  });

  it('should update a book', async () => {
    await books.deleteMany({});
    await books.insertOne(sampleBook);
    const updatedQuantity = 20;
    await books.updateOne(
      { isbn: sampleBook.isbn },
      { $set: { quantity: updatedQuantity } }
    );
    const updatedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(updatedBook?.quantity).toBe(updatedQuantity);
  });

  it('should delete a book', async () => {
    await books.deleteMany({});
    await books.insertOne(sampleBook);
    const deleteResult = await books.deleteOne({ isbn: sampleBook.isbn });
    expect(deleteResult.acknowledged).toBe(true);
    expect(deleteResult.deletedCount).toBe(1);
    const deletedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(deletedBook).toBeNull();
  });

  it('should handle stock update events', async () => {
    // Insert a book with initial stock
    await books.insertOne(sampleBook);
    
    // Simulate a stock update event
    const stockEvent = {
      type: 'StockUpdated',
      bookId: sampleBook.isbn,
      shelfId: 'shelf-1',
      quantity: 15,
      timestamp: new Date()
    };
    
    await mockMessaging.publishEvent(stockEvent, 'stock.updated');
    
    // Verify the event was published
    const events = mockMessaging.getEventsByType('StockUpdated');
    expect(events).toHaveLength(1);
    expect(events[0].bookId).toBe(sampleBook.isbn);
    expect(events[0].quantity).toBe(15);
  });

  it('should update book stock information', async () => {
    // Insert a book with initial stock
    await books.insertOne(sampleBook);
    
    // Update the stock information
    const updatedStock = 25;
    await books.updateOne(
      { isbn: sampleBook.isbn },
      { $set: { totalStock: updatedStock } }
    );
    
    const updatedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(updatedBook?.totalStock).toBe(updatedStock);
  });
}); 