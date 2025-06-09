import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
  // eslint-disable-next-line no-var
  var TEST_CLIENT: MongoClient;
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
  
  // Create a new client for tests
  global.TEST_CLIENT = new MongoClient(uri);
  await global.TEST_CLIENT.connect();
  
  return instance;
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