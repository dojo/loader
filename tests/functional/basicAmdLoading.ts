const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite('basic AMD loading', {
	'simple test'() {
		return executeTest(this, require, './basicAmdLoading.html', function(results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	},

	'AMD module with ID'() {
		return executeTest(this, require, './amdModuleWithId1.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - separate module file'() {
		return executeTest(this, require, './amdModuleWithId1a.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID'() {
		return executeTest(this, require, './amdModuleWithId2.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID and separate module files'() {
		return executeTest(this, require, './amdModuleWithId2a.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - module'() {
		return executeTest(this, require, './amdModuleWithId3.html', function(results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module with ID and dependency - module and separate module files'() {
		return executeTest(this, require, './amdModuleWithId3a.html', function(results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id'() {
		return executeTest(this, require, './amdModuleWithId4.html', function(results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id and separate module files'() {
		return executeTest(this, require, './amdModuleWithId4a.html', function(results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module with ID - dependency param omitted'() {
		return executeTest(this, require, './amdModuleWithId5.html', function(results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - no dependencies - object returned'() {
		return executeTest(this, require, './amdModuleWithId6.html', function(results: any) {
			assert.strictEqual(results.testModuleProperty, 'property value', 'Test module should load');
		});
	},

	'AMD module without ID and dependency - separate module file - object returned'() {
		return executeTest(this, require, './amdModuleWithId6a.html', function(results: any) {
			assert.strictEqual(results.aModuleProperty, 'a property value', 'Test module should load');
		});
	},

	'AMD module with circular dependency'() {
		const expected = {
			default: 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, require, './amdModuleCircular.html', function(results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with circular dependency 2'() {
		const expected = {
			default: 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, require, './amdModuleCircular2.html', function(results: any) {
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

		return executeTest(this, require, './amdModuleCircular3.html', function(results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with deep dependencies'() {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, require, './amdModuleDeepDeps.html', function(results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	},

	'AMD only factory require'() {
		const expected = {
			property: 'value'
		};
		return executeTest(this, require, './amdFactoryOnly.html', function(results: any) {
			assert.deepEqual(results, expected, 'Factory only should be resolved');
		});
	}
});
