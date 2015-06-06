define([
	'test/module1'
], function (testModule1) {
    return {
		getMessage: function () {
			return testModule1;
		}
	};
});
