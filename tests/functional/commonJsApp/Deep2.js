var deep3 = require('./deep3');

function Deep2() {}

Deep2.prototype.deep3 = function () {
	return deep3();
};

exports.default = Deep2;
