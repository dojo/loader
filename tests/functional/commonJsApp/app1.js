define([
	'require',
	'exports',
	'module'
], function (require, exports, module) {
	var testModule1 = require('test/module1');

	exports.getMessage = function () {
		return testModule1;
	};
});
