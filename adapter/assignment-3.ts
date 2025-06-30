import previous_assignment from './assignment-2.js'

export type BookID = string

export interface Book {
  id: BookID
  name: string
  author: string
  description: string
  price: number
  image: string
};

export interface Filter {
  from?: number
  to?: number
  name?: string
  author?: string
};

// If multiple filters are provided, any book that matches at least one of them should be returned
// Within a single filter, a book would need to match all the given conditions
const API_BASE_URL = '/api';
const BOOKS_ENDPOINT = `${API_BASE_URL}/books`;

async function listBooks(filters?: Filter[]): Promise<Book[]> {
  try {
    let url = BOOKS_ENDPOINT;
    if (filters && filters.length > 0) {
      url += `?filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Server error: ${errorMessage}`);
    }
    return await response.json() as Book[];
  } catch (error) {
    console.error('Error getting books:', error);
    throw new Error('Could not get the list of books. Please try again.');
  }
}

async function createOrUpdateBook (book: Book): Promise<BookID> {
  return await previous_assignment.createOrUpdateBook(book)
}

async function removeBook (book: BookID): Promise<void> {
  await previous_assignment.removeBook(book)
}

const assignment = 'assignment-3'

export default {
  assignment,
  createOrUpdateBook,
  removeBook,
  listBooks
}
