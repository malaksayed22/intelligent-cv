const { getSystemStatus } = require("../services/health.service");
const { successResponse } = require("../utils/api-response");

function healthCheck(req, res) {
  const status = getSystemStatus();
  res.status(200).json(successResponse(status));
}

module.exports = {
  healthCheck
};
