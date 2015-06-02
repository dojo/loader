// The 'test/module1' module is being defined in JS in an HTML test page, not in a module file of its own
define([
	'test/module1'
], function (testModule1) {
    return {
		getMessage: function () {
			return testModule1;
		}
	};
});
