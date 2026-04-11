function success(data, message = 'OK') {
	return {
		success: true,
		message,
		data
	};
}

function error(message = 'Internal Server Error', details = null) {
	return {
		success: false,
		message,
		details
	};
}

module.exports = {
	success,
	error
};
