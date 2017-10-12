const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';
import Node from 'intern/lib/executors/Node';

const amdAppMessage = 'Success';

let oldShouldInstrument: any;

/**
 * Gotchas for CSP testing
 *
 * - Selenium Drivers aren't able to inject scripts in most cases, as that violates the CSP rules, so
 *   the general process is:
 *
 *   - Load HTML page with CSP enabled
 *   - Load the loader with CSP enabled
 *   - Load test module with CSP enabled
 *   - The module, on load, redirects the location to a non-CSP page
 *   - The final results are read from this non-CSP page
 *
 * - CSP does not work with instrumentation enabled, but, we want instrumentation in all other cases. As such, we need
 *   to disable instrumentation for this suite, and re-enable it afterwards. There is no public API for this, so we need
 *   to perform some Intern wizardry.
 */
registerSuite('AMD loading with CSP enabled', {
	before() {
		oldShouldInstrument = (<Node> this.executor).shouldInstrumentFile;
		(<Node> this.executor).shouldInstrumentFile = (_filename: string) => false;
	},

	after() {
		(<Node> this.executor).shouldInstrumentFile = oldShouldInstrument;
	},

	tests: {
		simple() {
			if (this.remote.session.capabilities.browserName === 'MicrosoftEdge') {
				this.skip('CSP tests do not work in Edge');
			}

			return executeTest(this, require, './csp-simple.html', function (results: any) {
				assert.strictEqual(results.message, amdAppMessage, 'Local module should load');
			});
		},

		cdn() {
			if (this.remote.session.capabilities.browserName === 'MicrosoftEdge') {
				this.skip('CSP tests do not work in Edge');
			}

			const expected = {
				message: amdAppMessage,
				debounce: '#function'
			};

			return executeTest(this, require, './csp-cdn.html', function (results: any) {
				assert.deepEqual(results, expected, 'Local module and CDN module should load');
			});
		}
	}
});
