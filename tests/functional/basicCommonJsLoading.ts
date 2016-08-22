import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const COMMON_JS_APP_MESSAGE = 'Message from CommonJS app.';

registerSuite({
	name: 'basic CommonJS loading',

	'simple test'(this: any) {
		return executeTest(this, './basicCommonJsLoading.html', function (results: any) {
			assert.strictEqual(results.message, COMMON_JS_APP_MESSAGE);
		});
	},

	'CommonJS module with ID'(this: any) {
		return executeTest(this, './commonJsModuleWithId1.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module with explicit mid should load');
		});
	},

	'CommonJS module with ID and dependency - ID'(this: any) {
		const expected = {
			testModule1Value: 'testModule1',
			testModule2Value: 'testModule2'
		};

		return executeTest(this, './commonJsModuleWithId2.html', function (results: any) {
			assert.deepEqual(results, expected, 'Test modules with explicit mids should load');
		});
	},

	'CommonJS module with ID and dependency - module'(this: any) {
		const expected = {
			appModuleValue: COMMON_JS_APP_MESSAGE,
			testModule3Value: 'testModule3'
		};

		return executeTest(this, './commonJsModuleWithId3.html', function (results: any) {
			assert.deepEqual(results, expected, 'Test module and dependency should load');
		});
	},

	'CommonJS module without ID and dependency - id'(this: any) {
		return executeTest(this, './commonJsModuleWithId4.html', function (results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'CommonJS module with circular dependency'(this: any) {
		const expected = {
			message: 'circular1',
			circular2Message: 'circular2'
		};

		return executeTest(this, './commonJsModuleCircular.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with circular dependency 2'(this: any) {
		const expected = {
			message: 'circular2',
			circular1Message: 'circular1'
		};

		return executeTest(this, './commonJsModuleCircular2.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with circular dependency 3'(this: any) {
		const expected = {
			c1message: 'circular1',
			c1message2: 'circular2',
			c2message: 'circular2',
			c2message1: 'circular1'
		};

		return executeTest(this, './commonJsModuleCircular3.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with deep dependencies'(this: any) {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, './commonJsModuleDeepDeps.html', function (results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	}
});
