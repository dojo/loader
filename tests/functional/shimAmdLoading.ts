const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

registerSuite('Shim API AMD loading', {
	'shim tests'() {
		return executeTest(this, require, './shimAmdLoading.html', function (results: any) {
			assert.strictEqual(results.stringValue, 'string', 'Global value should have been read from nested path');
			assert.strictEqual(results.numberValue, 5, 'Init return value should be used as module value');
			assert.strictEqual(results.initTwice, 1, 'Module init function should only be called once');
			assert.strictEqual(results.addedValues, 8, 'Module dependencies should have resolved');
			assert.strictEqual(results.pluginDep, 'plugin-dep', 'Module dependencies should have loaded with no exports');
			assert.isUndefined(results.initNotReturn, 'Empty module export and init function should result in empty object');
		});
	},

	'non-existent global variable'() {
		return executeTest(this, require, './shimAmdLoading2.html', function (results: any) {
			assert.strictEqual(results.error, 'Tried to find badVariable but it did not exist', 'Non existent global variable expected to error');
		});
	}
});
