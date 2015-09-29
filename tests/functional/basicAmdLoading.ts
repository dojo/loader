import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite({
	name: 'basic AMD loading',

	'simple test'() {
		return executeTest(this, './basicAmdLoading.html', function (results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	},

	'AMD module with ID'() {
		return executeTest(this, './amdModuleWithId1.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - separate module file'() {
		return executeTest(this, './amdModuleWithId1a.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID'() {
		return executeTest(this, './amdModuleWithId2.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID and separate module files'() {
		return executeTest(this, './amdModuleWithId2a.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - module'() {
		return executeTest(this, './amdModuleWithId3.html', function (results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module with ID and dependency - module and separate module files'() {
		return executeTest(this, './amdModuleWithId3a.html', function (results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id'() {
		return executeTest(this, './amdModuleWithId4.html', function (results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id and separate module files'() {
		return executeTest(this, './amdModuleWithId4a.html', function (results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module with ID - dependency param omitted'() {
		return executeTest(this, './amdModuleWithId5.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - no dependencies - object returned'() {
		return executeTest(this, './amdModuleWithId6.html', function (results: any) {
			assert.strictEqual(results.testModuleProperty, 'property value', 'Test module should load');
		});
	},

	'AMD module without ID and dependency - separate module file - object returned'() {
		return executeTest(this, './amdModuleWithId6a.html', function (results: any) {
			assert.strictEqual(results.aModuleProperty, 'a property value', 'Test module should load');
		});
	},

	'AMD module with circular dependency'() {
		const expected = {
			'default': 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleCircular.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with circular dependency 2'() {
		const expected = {
			'default': 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleCircular2.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with circular dependency 3'() {
		const expected = {
			c1default: 'circular2',
			c1message: 'circular1.getMessage',
			c2default: 'circular2',
			c2message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleCircular3.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with deep dependencies'() {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, './amdModuleDeepDeps.html', function (results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	}
});
