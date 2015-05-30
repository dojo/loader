import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function executeTest(suite: Suite, htmlTestPath: string, testFn: (result: any) => void, timeout = 5000): Command<any> {
	return suite.remote
		.get((<any>require).toUrl(htmlTestPath))
		.then(pollUntil<any>(function () {
			return (<any>window).loaderTestResults;
		}, null, timeout), undefined)
		.then(testFn, function () {
			throw new Error('loaderTestResult was not set.');
		});
}

registerSuite({
	name: 'basic AMD loading',

	'simple test'() {
		return executeTest(this, './basicAmdLoading.html', function (results: any) {
				assert.strictEqual(results.message, 'Message from AMD app.');
			});
	},

	'AMD module with ID'() {
		return executeTest(this, './amdModuleWithId1.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1');
		});
	},

	'AMD module with ID and dependency - ID'() {
		return executeTest(this, './amdModuleWithId2.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1');
			assert.strictEqual(results.testModule2Value, 'testModule2');
		});
	},

	'AMD module with ID and dependency - module'() {
		return executeTest(this, './amdModuleWithId3.html', function (results: any) {
			// TODO: not working
			assert.isTrue(results.testModule3Loaded);
			assert.strictEqual(results.testModule3Value, 'testModule3');
		});
	}
});
