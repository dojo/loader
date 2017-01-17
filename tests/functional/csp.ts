import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as intern from 'intern';
import executeTest from './executeTest';

const amdAppMessage = 'Success';

let oldInstrumentation: any;

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
registerSuite({
	name: 'AMD loading with CSP enabled',

	setup(this: any) {
		oldInstrumentation = (<any> intern).executor.proxy.config.instrument;
		(<any> intern).executor.proxy.config.instrument = false;
	},

	teardown(this: any) {

		(<any> intern).executor.proxy.config.instrument = oldInstrumentation;
	},

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
