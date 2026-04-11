const { mongoose } = require('../config/database');

function createNotFoundError() {
  const error = new Error('no file with that id');
  error.statusCode = 404;
  return error;
}

async function getGridFsFileById(fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    throw createNotFoundError();
  }

  const objectId = new mongoose.Types.ObjectId(fileId);

  if (!mongoose.connection?.db) {
    throw createNotFoundError();
  }

  const fileDoc = await mongoose.connection.db.collection('fs.files').findOne({ _id: objectId });

  if (!fileDoc) {
    throw createNotFoundError();
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'fs'
  });

  return {
    fileDoc,
    stream: bucket.openDownloadStream(objectId)
  };
}

module.exports = {
  getGridFsFileById,
  createNotFoundError
};
