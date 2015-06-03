var testModule1 = require('test/module1');

exports.default = {
	testModule1Value: testModule1,
	testModule2Value: 'testModule2'
};

module.id = 'test/module2';
