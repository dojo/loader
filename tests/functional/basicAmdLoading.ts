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
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID'() {
		return executeTest(this, './amdModuleWithId2.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - module'() {
		return executeTest(this, './amdModuleWithId3.html', function (results: any) {
			assert.isTrue(results.testModule3Loaded);
			assert.strictEqual(results.testModule3Value, 'testModule3');
		});
	},

	'AMD module with ID - dependency param omitted'() {
		return executeTest(this, './amdModuleWithId4.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with circular dependency'() {
		const expected = {
			default: 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleWithId6.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with deep dependencies'() {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, './amdModuleWithId7.html', function (results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	}
});
