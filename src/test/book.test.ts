import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getBookDatabase, Book } from './db.js';
import { setup, teardown } from './setup.js';
import { MongoClient, Collection } from 'mongodb';

function logTest(message: string, data?: Record<string, unknown>) {
  console.log(`[Book Test] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

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

  beforeAll(async () => {
    logTest('Starting beforeAll hook');
    try {
      logTest('Setting up MongoDB');
      await setup();
      logTest('Setup completed');
      
      logTest('Getting database connection');
      const db = getBookDatabase();
      client = db.client;
      books = db.books;
      
      logTest('Connecting to database');
      await client.connect();
      logTest('Database connected successfully');
    } catch (error: unknown) {
      const errorInfo = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : { error: String(error) };
      logTest('beforeAll hook failed', errorInfo);
      throw error;
    }
  });

  afterAll(async () => {
    logTest('Starting afterAll hook');
    try {
      logTest('Closing database connection');
      await client.close();
      logTest('Database connection closed');
      
      logTest('Running teardown');
      await teardown();
      logTest('Teardown completed');
    } catch (error: unknown) {
      const errorInfo = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : { error: String(error) };
      logTest('afterAll hook failed', errorInfo);
      throw error;
    }
  });

  it('should insert and retrieve a book', async () => {
    logTest('Starting insert and retrieve test');
    await books.deleteMany({});
    const result = await books.insertOne(sampleBook);
    expect(result.acknowledged).toBe(true);
    const retrievedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(retrievedBook).toMatchObject(sampleBook);
    logTest('Insert and retrieve test completed');
  });

  it('should not find a non-existent book', async () => {
    logTest('Starting non-existent book test');
    await books.deleteMany({});
    const nonExistentBook = await books.findOne({ isbn: 'nonexistent' });
    expect(nonExistentBook).toBeNull();
    logTest('Non-existent book test completed');
  });

  it('should update a book', async () => {
    logTest('Starting update book test');
    await books.deleteMany({});
    await books.insertOne(sampleBook);
    const updatedQuantity = 20;
    await books.updateOne(
      { isbn: sampleBook.isbn },
      { $set: { quantity: updatedQuantity } }
    );
    const updatedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(updatedBook?.quantity).toBe(updatedQuantity);
    logTest('Update book test completed');
  });

  it('should delete a book', async () => {
    logTest('Starting delete book test');
    await books.deleteMany({});
    await books.insertOne(sampleBook);
    const deleteResult = await books.deleteOne({ isbn: sampleBook.isbn });
    expect(deleteResult.acknowledged).toBe(true);
    expect(deleteResult.deletedCount).toBe(1);
    const deletedBook = await books.findOne({ isbn: sampleBook.isbn });
    expect(deletedBook).toBeNull();
    logTest('Delete book test completed');
  });
}); 