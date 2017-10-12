const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

registerSuite('Cross origin configuration', {
	'cross origin false'() {
		return executeTest(this, require, './crossOriginFalse.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is null');
		});
	},
	'cross origin anonymous'() {
		return executeTest(this, require, './crossOriginAnon.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is anonymous');
		});
	},
	'cross origin use-credentials'() {
		return executeTest(this, require, './crossOriginCreds.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is use-credentials');
		});
	}
});
