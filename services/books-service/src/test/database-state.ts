import { BookRepository } from '../domains/book-listing/domain.js';

// Interface for book database state
export interface AppBookDatabaseState {
    books: BookRepository;
}

// Alias for backwards compatibility
export type AppDatabaseState = AppBookDatabaseState; 