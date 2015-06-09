define(function (require, exports) {
	var circular2 = require('./circular2');

	exports.getMessage = function () {
		return 'circular1';
	};

	exports.circular2Message = function () {
		return circular2.getMessage();
	};
});
