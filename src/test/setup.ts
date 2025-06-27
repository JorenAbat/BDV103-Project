import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import path from 'path';
import os from 'os';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
  // eslint-disable-next-line no-var
  var TEST_CLIENT: MongoClient;
}

export async function setup() {
  // If MONGO_URI is provided (CI environment), use it directly
  if (process.env.MONGO_URI) {
    const uri = process.env.MONGO_URI;
    global.MONGO_URI = uri;
    
    // Create a new client for tests
    global.TEST_CLIENT = new MongoClient(uri);
    await global.TEST_CLIENT.connect();
    
    // Return a mock instance for compatibility
    return {
      getUri: () => uri,
      stop: async () => {
        if (global.TEST_CLIENT) {
          await global.TEST_CLIENT.close();
        }
      }
    } as unknown as MongoMemoryServer;
  }

  // Otherwise, use mongodb-memory-server (local development)
  const instance = await MongoMemoryServer.create({
    binary: {
      version: '7.0.7',
      downloadDir: path.join(os.tmpdir(), 'mongodb-binaries'),
      checkMD5: false,
      systemBinary: process.env.MONGOMS_SYSTEM_BINARY
    }
  });

  try {
    while (instance.state === 'new') {
      await instance.start();
    }

    const uri = instance.getUri();
    global.MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
    
    // Create a new client for tests
    global.TEST_CLIENT = new MongoClient(uri);
    await global.TEST_CLIENT.connect();
    
    return instance;
  } catch (error) {
    console.error('Error setting up MongoDB memory server:', error);
    throw error;
  }
}

export async function teardown(instance: MongoMemoryServer) {
  if (instance) {
    try {
      if (global.TEST_CLIENT) {
        await global.TEST_CLIENT.close();
      }
      await instance.stop();
    } catch (error) {
      console.error('Error during teardown:', error);
      throw error;
    }
  }
} 