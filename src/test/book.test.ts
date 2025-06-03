import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getBookDatabase, Book, client } from './db.js';
import { setup, teardown } from './setup.js';

describe('Book Database Tests', () => {
  const db = getBookDatabase();
  
  const sampleBook: Book = {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '1234567890',
    price: 29.99,
    quantity: 10
  };

  beforeAll(async () => {
    // Setup MongoDB memory server
    await setup();
    // Connect to the database
    await client.connect();
    // Clean up the collection before each test
    await db.books.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    await db.books.deleteMany({});
    // Close the connection
    await client.close();
    // Teardown MongoDB memory server
    await teardown();
  });

  it('should insert and retrieve a book', async () => {
    // Insert a book
    const result = await db.books.insertOne(sampleBook);
    expect(result.acknowledged).toBe(true);

    // Retrieve the book
    const retrievedBook = await db.books.findOne({ isbn: sampleBook.isbn });
    expect(retrievedBook).toMatchObject(sampleBook);
  });
}); 