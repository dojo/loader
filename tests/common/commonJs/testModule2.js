define(function (require, exports, module) {
	var testModule1 = require('test/module1');

	module.exports = {
		testModule1Value: testModule1,
		testModule2Value: 'testModule2'
	};

	module.id = 'test/module2';
});
