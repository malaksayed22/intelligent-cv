class SystemStatus {
  constructor(service, status, timestamp) {
    this.service = service;
    this.status = status;
    this.timestamp = timestamp;
  }
}

module.exports = SystemStatus;
