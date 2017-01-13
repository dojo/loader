import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

registerSuite({
	name: 'Cross origin configuration',

	'cross origin false'(this: any) {
		return executeTest(this, './crossOriginFalse.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is null');
		});
	},
	'cross origin anonymous'(this: any) {
		return executeTest(this, './crossOriginAnon.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is anonymous');
		});
	},
	'cross origin use-credentials'(this: any) {
		return executeTest(this, './crossOriginCreds.html', function (results: any) {
			assert.strictEqual(results.message, 'The cross origin value is use-credentials');
		});
	}
});
