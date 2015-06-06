define('test/module2', [
	'test/module1'
], function (testModule1) {
	return {
		testModule1Value: testModule1,
		testModule2Value: 'testModule2'
	};
});
