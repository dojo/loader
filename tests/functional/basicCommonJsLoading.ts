const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

const COMMON_JS_APP_MESSAGE = 'Message from CommonJS app.';

registerSuite('browser - basic CommonJS loading', {
	'simple test'() {
		return executeTest(this, require, './basicCommonJsLoading.html', function(results: any) {
			assert.strictEqual(results.message, COMMON_JS_APP_MESSAGE);
		});
	},

	'CommonJS module with ID'() {
		return executeTest(this, require, './commonJsModuleWithId1.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module with explicit mid should load');
		});
	},

	'CommonJS module with ID and dependency - ID'() {
		const expected = {
			testModule1Value: 'testModule1',
			testModule2Value: 'testModule2'
		};

		return executeTest(this, require, './commonJsModuleWithId2.html', function(results: any) {
			assert.deepEqual(results, expected, 'Test modules with explicit mids should load');
		});
	},

	'CommonJS module with ID and dependency - module'() {
		const expected = {
			appModuleValue: COMMON_JS_APP_MESSAGE,
			testModule3Value: 'testModule3'
		};

		return executeTest(this, require, './commonJsModuleWithId3.html', function(results: any) {
			assert.deepEqual(results, expected, 'Test module and dependency should load');
		});
	},

	'CommonJS module without ID and dependency - id'() {
		return executeTest(this, require, './commonJsModuleWithId4.html', function(results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'CommonJS module with circular dependency'() {
		const expected = {
			message: 'circular1',
			circular2Message: 'circular2'
		};

		return executeTest(this, require, './commonJsModuleCircular.html', function(results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with circular dependency 2'() {
		const expected = {
			message: 'circular2',
			circular1Message: 'circular1'
		};

		return executeTest(this, require, './commonJsModuleCircular2.html', function(results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with circular dependency 3'() {
		const expected = {
			c1message: 'circular1',
			c1message2: 'circular2',
			c2message: 'circular2',
			c2message1: 'circular1'
		};

		return executeTest(this, require, './commonJsModuleCircular3.html', function(results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'CommonJS module with deep dependencies'() {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, require, './commonJsModuleDeepDeps.html', function(results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	}
});
