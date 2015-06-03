var app = require('commonJsApp/app');

exports.default = {
	appModuleValue: app.getMessage(),
	testModule3Value: 'testModule3'
};

module.id = 'test/module3';
