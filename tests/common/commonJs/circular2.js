define(function (require, exports) {
	var circular1 = require('./circular1');

	exports.getMessage = function () {
		return 'circular2';
	};

	exports.circular1Message = function() {
		return circular1.getMessage();
	};
});
