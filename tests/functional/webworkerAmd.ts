const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import executeTest from './executeTest';

const AMD_APP_MESSAGE = 'Message from AMD app.';

registerSuite('AMD loading in web worker', {
	'basic loading'() {
		return executeTest(this, require, './webworkerBasic.html', function(results: any) {
			assert.strictEqual(results.message, AMD_APP_MESSAGE);
		});
	}
});
