import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown } from './setup.js';
import { client } from '../db/mongodb.js';
import type { Book } from '../domains/book-listing/domain.js';

describe('Book Tests', () => {
    beforeAll(async () => {
        await setup();
        await client.connect();
    });

    afterAll(async () => {
        await client.close();
        await teardown();
    });

    it('should insert and retrieve a book', async () => {
        const book: Book = {
            id: 'book-001',
            title: 'Test Book',
            author: 'Test Author',
            description: 'A test book',
            price: 19.99
        };

        const db = await client.db();
        const collection = db.collection('books');
        await collection.insertOne(book);

        const retrieved = await collection.findOne({ id: book.id });
        expect(retrieved).toEqual(book);
    });

    it('should return null for non-existent book', async () => {
        const db = await client.db();
        const collection = db.collection('books');
        const book = await collection.findOne({ id: 'non-existent' });
        expect(book).toBeNull();
    });

    it('should update a book', async () => {
        const book: Book = {
            id: 'book-002',
            title: 'Original Title',
            author: 'Original Author',
            description: 'Original description',
            price: 29.99
        };

        const db = await client.db();
        const collection = db.collection('books');
        await collection.insertOne(book);

        const updatedBook = { 
            ...book, 
            title: 'Updated Title', 
            description: 'Updated description',
            price: 39.99 
        };
        await collection.updateOne({ id: book.id }, { $set: updatedBook });

        const retrieved = await collection.findOne({ id: book.id });
        expect(retrieved).toEqual(updatedBook);
    });

    it('should delete a book', async () => {
        const book: Book = {
            id: 'book-003',
            title: 'To Delete',
            author: 'Test Author',
            description: 'A book to delete',
            price: 9.99
        };

        const db = await client.db();
        const collection = db.collection('books');
        await collection.insertOne(book);

        await collection.deleteOne({ id: book.id });
        const retrieved = await collection.findOne({ id: book.id });
        expect(retrieved).toBeNull();
    });
}); 