import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getBookDatabase, Book } from './db.js';
import { setup, teardown } from './setup.js';
import { MongoClient, Collection } from 'mongodb';
import type { MongoMemoryServer } from 'mongodb-memory-server';

describe('Book Database Tests', () => {
  const sampleBook: Book = {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '1234567890',
    price: 29.99,
    quantity: 10
  };

  let client: MongoClient;
  let books: Collection<Book>;
  let mongoInstance: MongoMemoryServer;

  beforeAll(async () => {
    mongoInstance = await setup();
    const db = getBookDatabase();
    client = db.client;
    books = db.books;
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await teardown(mongoInstance);
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
}); 