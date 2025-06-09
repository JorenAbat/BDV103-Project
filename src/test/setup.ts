import { MongoMemoryServer } from 'mongodb-memory-server';
import { client } from '../db/mongodb.js';

declare global {
  // eslint-disable-next-line no-var
  var __MONGOINSTANCE: MongoMemoryServer;
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
}

let instance: MongoMemoryServer | null = null;

export async function setup() {
  try {
    // Clean up any existing instance first
    if (instance) {
      await instance.stop();
      instance = null;
    }

    // Create new instance with explicit download options
    instance = await MongoMemoryServer.create({
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
    global.__MONGOINSTANCE = instance;
    global.MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
  } catch (error) {
    console.error('Failed to setup MongoDB memory server:', error);
    throw error;
  }
}

export async function teardown() {
  try {
    if (instance) {
      // Drop the entire database to ensure a clean state
      const db = client.db();
      await db.dropDatabase();
      
      await instance.stop();
      instance = null;
    }
  } catch (error) {
    console.error('Failed to teardown MongoDB memory server:', error);
    throw error;
  }
} 