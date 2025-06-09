import { MongoMemoryServer } from 'mongodb-memory-server';
import { client } from '../db/mongodb.js';

declare global {
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
}

function logDebug(message: string, data?: Record<string, unknown>) {
  console.log(`[MongoDB Debug] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export async function setup() {
  logDebug('Starting setup...');
  try {
    logDebug('Creating new MongoDB Memory Server instance...');
    // Create new instance with explicit download options and cache directory
    const instance = await MongoMemoryServer.create({
      binary: {
        version: '7.0.7',
        downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || '/tmp/mongodb-binaries',
        checkMD5: false,
        systemBinary: process.env.MONGOMS_SYSTEM_BINARY
      },
      instance: {
        storageEngine: 'wiredTiger',
        args: ['--quiet']
      }
    });
    logDebug('MongoDB Memory Server instance created', { state: instance.state });

    logDebug('Starting MongoDB Memory Server...');
    while (instance.state === 'new') {
      logDebug('Waiting for instance to start...', { state: instance.state });
      await instance.start();
    }
    logDebug('MongoDB Memory Server started', { state: instance.state });

    const uri = instance.getUri();
    logDebug('Got MongoDB URI', { uri });
    
    global.MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
    logDebug('Setup completed successfully');
    
    return instance;
  } catch (error: unknown) {
    const errorInfo = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { error: String(error) };
    logDebug('Setup failed with error', errorInfo);
    throw error;
  }
}

export async function teardown(instance: MongoMemoryServer) {
  logDebug('Starting teardown...');
  try {
    if (instance) {
      logDebug('Found instance to cleanup');
      
      // Drop the entire database to ensure a clean state
      logDebug('Dropping database...');
      const db = client.db();
      await db.dropDatabase();
      logDebug('Database dropped');
      
      logDebug('Stopping MongoDB Memory Server...');
      await instance.stop();
      logDebug('MongoDB Memory Server stopped');
    } else {
      logDebug('No instance found to cleanup');
    }
    logDebug('Teardown completed successfully');
  } catch (error: unknown) {
    const errorInfo = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { error: String(error) };
    logDebug('Teardown failed with error', errorInfo);
    throw error;
  }
} 