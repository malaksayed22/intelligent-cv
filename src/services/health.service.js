const SystemStatus = require("../models/system-status.model");

function getSystemStatus() {
  return new SystemStatus("javascript-backend", "ok", new Date().toISOString());
}

module.exports = {
  getSystemStatus
};
