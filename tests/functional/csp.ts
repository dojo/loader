import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const amdAppMessage = 'Message from AMD app.';

registerSuite({
	name: 'AMD loading with CSP enabled',

	simple(this: any) {
		const browser = this.remote.session.capabilities.browserName;

		if (browser === 'firefox' || browser === 'MicrosoftEdge') {
			return this.skip('CSP is not supported in selenium and ' + browser);
		}

		return executeTest(this, './csp-simple.html', function (results: any) {
			assert.strictEqual(results.message, amdAppMessage, 'Local module should load');
		});
	},

	cdn(this: any) {
		const browser = this.remote.session.capabilities.browserName;

		if (browser === 'firefox' || browser === 'MicrosoftEdge') {
			return this.skip('CSP is not supported in selenium and ' + browser);
		}

		const expected = {
			message: amdAppMessage,
			debounce: 'function'
		};

		return executeTest(this, './csp-cdn.html', function (results: any) {
			assert.deepEqual(results, expected, 'Local module and CDN module should load');
		});
	}
});
