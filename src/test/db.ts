import { MongoClient, Db, Collection } from 'mongodb';

export interface Book {
  _id?: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  quantity: number;
}

const uri = (global as any).MONGO_URI as string ?? 'mongodb://mongo';

export const client = new MongoClient(uri);

export interface BookDatabaseAccessor {
  database: Db;
  books: Collection<Book>;
}

export function getBookDatabase(): BookDatabaseAccessor {
  // If we aren't testing, we are creating a random database name
  const database = client.db((global as any).MONGO_URI !== undefined ? Math.floor(Math.random() * 100000).toPrecision() : 'database-name');
  
  const books = database.collection<Book>('books');

  return {
    database,
    books
  };
} 