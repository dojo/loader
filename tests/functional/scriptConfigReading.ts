const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite('Script tag configuration', {
	'script tag config'() {
		return executeTest(this, require, './scriptConfigReading.html', function (results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	}
});
