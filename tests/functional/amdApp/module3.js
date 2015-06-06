define('test/module3', [
	'amdApp/app'
], function (app) {
	return {
		appModuleValue: app.getMessage(),
		testModule3Value: 'testModule3'
	};
});
