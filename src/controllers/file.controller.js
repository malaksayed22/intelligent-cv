const { error: errorResponse } = require('../utils/api-response');
const { getGridFsFileById } = require('../services/file.service');

async function getFileById(req, res) {
  try {
    const { file_id: fileId } = req.params;
    const { fileDoc, stream } = await getGridFsFileById(fileId);

    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename=\"${fileDoc.filename || 'file'}\"`);

    stream.once('error', () => {
      if (!res.headersSent) {
        return res.status(404).json(errorResponse('no file with that id'));
      }

      return res.end();
    });

    return stream.pipe(res);
  } catch (_error) {
    return res.status(404).json(errorResponse('no file with that id'));
  }
}

module.exports = {
  getFileById
};
