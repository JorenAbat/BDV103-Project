import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
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
  // Now the URI will be set because setup() has run
  const uri = global.MONGO_URI;
  const client = new MongoClient(uri);
  const database = client.db(Math.floor(Math.random() * 100000).toPrecision());
  const books = database.collection<Book>('books');
  return { client, database, books };
} 