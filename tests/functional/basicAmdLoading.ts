import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

registerSuite({
	name: 'basic AMD loading',
	'simple test'() {
		return this.remote
			.get((<any>require).toUrl('./basicAmdLoading.html'))
			.then(pollUntil(function () {
				return (<any>window).testMessage;
			}, null, 5000))
			.then(function (message: string) {
				assert.strictEqual(message, 'Message from AMD app.');
			});
	}
});
