import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as fs from 'intern/dojo/node!fs';
import * as Module from 'intern/dojo!module';
import * as path from 'intern/dojo/node!path';
import * as vm from 'intern/dojo/node!vm';
import * as Promise from 'dojo/Promise';

const basePath = './_build/tests/unit/';
const timeout = 1000;

let testContext: any;

function readFile(filePath: string): Promise<string> {
	return new Promise(function (resolve, reject) {
		fs.readFile(filePath, 'utf8', function (error: Error, data: string) {
			if (error) {
				reject(error);
			}
			else {
				resolve(data);
			}
		});
	});
}

registerSuite({
	name: 'basic CommonJS loading',

	setup() {
		testContext = vm.createContext({
			console: console,
			process: process
		});
	},

	'simple test'() {
		let dfd = this.async(timeout);
		let testCaseFileName = 'simpleTest.js';
		let testModule = new Module(testCaseFileName);

		testContext.module = testModule;
		testContext.require = function (path: string) {
			return testModule.require(path);
		};
		testContext.__filename = testCaseFileName;
		testContext.__dirname = path.dirname(testCaseFileName);

		readFile(basePath + testCaseFileName).then(function (moduleSource) {
			let result = vm.runInContext(moduleSource, testContext, testCaseFileName);
			console.log(result);
		});

		// fs.readFile(basePath + testCaseFileName, 'utf8', function (error: Error, data: any) {
		// 	if (error) {
		// 		dfd.reject(error);
		// 	}
		// 	else {
		// 		dfd.callback(function () {
		// 			var module = data;
		// 			var result = vm.runInContext(module, testContext, testCaseFileName);
		// 			console.log(result);
		// 		})();
		// 	}
		// });
	}
});
