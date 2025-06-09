import { MongoMemoryServer } from 'mongodb-memory-server';
import { client } from '../db/mongodb.js';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
}

export async function setup() {
  // Create new instance with explicit download options
  const instance = await MongoMemoryServer.create({
    binary: {
      version: '7.0.7',
      downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || undefined,
      checkMD5: false
    }
  });

  while (instance.state === 'new') {
    await instance.start();
  }

  const uri = instance.getUri();
  global.MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
  
  return instance;
}

export async function teardown(instance: MongoMemoryServer) {
  if (instance) {
    // Drop the entire database to ensure a clean state
    const db = client.db();
    await db.dropDatabase();
    await instance.stop();
  }
} 