define([
	'require',
	'module'
], function (require, module) {
	var Deep2 = require('./Deep2');

	module.exports = function () {
		return new Deep2();
	};
});
