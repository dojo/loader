// Put this module in node paths, e.g. node_modules
//var cjsmodule = require('cjs/module1');
var loader = require('./_build/src/loader.js');

global.require([
	'cjs/module1',
	'_build/tests/common/app'
], function (cjsmodule, app) {
	console.log(cjsmodule + app);
});
