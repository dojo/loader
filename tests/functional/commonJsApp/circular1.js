define([
	'require',
	'exports'
], function (require, exports) {
	var circular2 = require('./circular2');

	exports.default = function () {
		return circular2.default();
	};

	exports.getMessage = function () {
		return 'circular1.getMessage';
	};
});
