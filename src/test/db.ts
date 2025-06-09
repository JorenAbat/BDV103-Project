import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
  // eslint-disable-next-line no-var
  var TEST_CLIENT: MongoClient;
}

export interface Book {
  _id?: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  quantity: number;
}

export interface BookDatabaseAccessor {
  client: MongoClient;
  database: Db;
  books: Collection<Book>;
}

export function getBookDatabase(): BookDatabaseAccessor {
  const database = global.TEST_CLIENT.db(Math.floor(Math.random() * 100000).toPrecision());
  const books = database.collection<Book>('books');
  return { client: global.TEST_CLIENT, database, books };
} 