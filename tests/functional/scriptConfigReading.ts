import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite({
	name: 'Script tag configuration',

	'script tag config'(this: any) {
		return executeTest(this, './scriptConfigReading.html', function (results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	}
});
