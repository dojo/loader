import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const amdAppMessage = 'Success';

registerSuite({
	name: 'AMD loading with CSP enabled',

	simple(this: any) {
		return executeTest(this, './csp-simple.html', function (results: any) {
			assert.strictEqual(results.message, amdAppMessage, 'Local module should load');
		});
	},

	cdn(this: any) {
		const expected = {
			message: amdAppMessage,
			debounce: '#function'
		};

		return executeTest(this, './csp-cdn.html', function (results: any) {
			assert.deepEqual(results, expected, 'Local module and CDN module should load');
		});
	}
});
