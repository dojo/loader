define([ 'exports', './circular1' ], function (exports, circular1) {
	exports.default = function () {
		return 'circular2';
	};

	exports.getMessage = function () {
		return circular1.getMessage();
	};
});
