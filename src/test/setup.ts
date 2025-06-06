import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGOINSTANCE: MongoMemoryServer;
  // eslint-disable-next-line no-var
  var MONGO_URI: string;
}

export async function setup() {
  const instance = await MongoMemoryServer.create({ binary: { version: '6.0.12' } });

  while (instance.state === 'new') {
    await instance.start();
  }

  const uri = instance.getUri();
  global.__MONGOINSTANCE = instance;
  global.MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
}

export async function teardown() {
  if (global.__MONGOINSTANCE) {
    await global.__MONGOINSTANCE.stop();
  }
} 