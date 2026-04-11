class SystemStatus {
	constructor({ status, timestamp, uptimeInSeconds, database }) {
		this.status = status;
		this.timestamp = timestamp;
		this.uptimeInSeconds = uptimeInSeconds;
		this.database = database;
	}
}

module.exports = SystemStatus;
