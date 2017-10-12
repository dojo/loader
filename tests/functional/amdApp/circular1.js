define([ 'exports', './circular2' ], function (exports, circular2) {
	exports.default = function () {
		return circular2.default();
	};

	exports.getMessage = function () {
		return 'circular1.getMessage';
	};
});
