const mongoose = require('mongoose');

const REQUIRED_COLLECTIONS = [
  'hr',
  'candidates',
  'job_posts',
  'submitted_applications',
  'uploaded_resumes'
];

async function connectToDatabase(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set.');
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000
  });
}

async function ensureCollectionsExist() {
  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  for (const name of REQUIRED_COLLECTIONS) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  mongoose,
  REQUIRED_COLLECTIONS,
  connectToDatabase,
  ensureCollectionsExist,
  disconnectDatabase
};
