import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as fs from 'intern/dojo/node!fs';
import * as vm from 'intern/dojo/node!vm';

const basePath = './_build/tests/unit/';
const timeout = 1000;

let testContext: any;

registerSuite({
	name: 'basic CommonJS loading',

	before() {
		testContext = vm.createContext({
			require: global.require
		});
	},

	'simple test'() {
		var dfd = this.async(timeout);

		fs.readFile(basePath + 'simpleTest.js', 'utf8', function (error: Error, data: any) {
			if (error) {
				dfd.reject(error);
			}
			else {
				dfd.callback(function () {
					var module = data;
					var result = vm.runInContext(module, testContext);
					console.log(result);
				})();
			}
		});
	}
});
