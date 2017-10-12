define([ 'exports', './deep3' ], function (exports, deep3) {
	var Deep2 = function () {};
	Deep2.prototype.deep3 = function () {
		return deep3.default();
	};

	exports.default = Deep2;
});
