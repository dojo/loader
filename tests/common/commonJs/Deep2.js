define(function (require, exports, module) {
	var deep3 = require('./deep3');

	function Deep2() {}

	Deep2.prototype.deep3 = function () {
		return deep3();
	};

	module.exports = Deep2;
});
