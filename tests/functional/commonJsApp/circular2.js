var circular1 = require('./circular1');

exports.default = function () {
	return 'circular2';
};

exports.circular1Message = function() {
	return circular1.getMessage();
};
