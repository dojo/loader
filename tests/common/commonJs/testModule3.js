define(function (require, exports, module) {
	var app = require('./app');

	module.exports = {
		appModuleValue: app.getMessage(),
		testModule3Value: 'testModule3'
	};

	module.id = 'test/module3';
});
