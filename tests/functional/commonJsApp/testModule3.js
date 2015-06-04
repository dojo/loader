define([
	'require',
	'exports',
	'module'
], function (require, exports, module) {
	var app = require('commonJsApp/app');

	exports.default = {
		appModuleValue: app.getMessage(),
		testModule3Value: 'testModule3'
	};

	module.id = 'test/module3';
});
