import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

// Own a fresh database per run; never clear a developer's configured database.
const dbName = `leia_integration_${randomUUID().replaceAll('-', '')}`;
export async function connectMongo() {
  if (!process.env.TEST_MONGO_URI) throw new Error('TEST_MONGO_URI is required for integration tests');
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 });
}
export async function closeMongo() {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
  }
}
export async function listen(app) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}
