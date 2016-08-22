import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite({
	name: 'basic AMD loading',

	'simple test'(this: any) {
		return executeTest(this, './basicAmdLoading.html', function (results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	},

	'AMD module with ID'(this: any) {
		return executeTest(this, './amdModuleWithId1.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - separate module file'(this: any) {
		return executeTest(this, './amdModuleWithId1a.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID'(this: any) {
		return executeTest(this, './amdModuleWithId2.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - ID and separate module files'(this: any) {
		return executeTest(this, './amdModuleWithId2a.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Dependency module should load');
			assert.strictEqual(results.testModule2Value, 'testModule2', 'Test module should load');
		});
	},

	'AMD module with ID and dependency - module'(this: any) {
		return executeTest(this, './amdModuleWithId3.html', function (results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module with ID and dependency - module and separate module files'(this: any) {
		return executeTest(this, './amdModuleWithId3a.html', function (results: any) {
			assert.strictEqual(results.appModuleValue, AMD_APP_MESSAGE, 'Test module and dependency should load');
			assert.strictEqual(results.testModule3Value, 'testModule3', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id'(this: any) {
		return executeTest(this, './amdModuleWithId4.html', function (results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module without ID and dependency - id and separate module files'(this: any) {
		return executeTest(this, './amdModuleWithId4a.html', function (results: any) {
			assert.strictEqual(results, 'testModule1', 'Test module and dependency should load');
		});
	},

	'AMD module with ID - dependency param omitted'(this: any) {
		return executeTest(this, './amdModuleWithId5.html', function (results: any) {
			assert.strictEqual(results.testModule1Value, 'testModule1', 'Test module should load');
		});
	},

	'AMD module with ID - no dependencies - object returned'(this: any) {
		return executeTest(this, './amdModuleWithId6.html', function (results: any) {
			assert.strictEqual(results.testModuleProperty, 'property value', 'Test module should load');
		});
	},

	'AMD module without ID and dependency - separate module file - object returned'(this: any) {
		return executeTest(this, './amdModuleWithId6a.html', function (results: any) {
			assert.strictEqual(results.aModuleProperty, 'a property value', 'Test module should load');
		});
	},

	'AMD module with circular dependency'(this: any) {
		const expected = {
			'default': 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleCircular.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with circular dependency 2'(this: any) {
		const expected = {
			'default': 'circular2',
			message: 'circular1.getMessage'
		};

		return executeTest(this, './amdModuleCircular2.html', function (results: any) {
			assert.deepEqual(results, expected, 'Circular dependency should be resolved');
		});
	},

	'AMD module with circular dependency 3'(this: any) {
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

	'AMD module with deep dependencies'(this: any) {
		const expected = {
			objectExport: 'objectExport'
		};

		return executeTest(this, './amdModuleDeepDeps.html', function (results: any) {
			assert.deepEqual(results, expected, 'Deep dependency should be resolved');
		});
	},

	'AMD only factory require'(this: any) {
		const expected = {
			property: 'value'
		};
		return executeTest(this, './amdFactoryOnly.html', function(results: any) {
			assert.deepEqual(results, expected, 'Factory only should be resolved');
		});
	}
});
