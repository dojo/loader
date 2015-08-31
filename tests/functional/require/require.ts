import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function executeTest(suite: Suite, htmlTestPath: string, testFn: (result: any) => void, timeout = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(htmlTestPath))
		.then(pollUntil<any>(function () {
			return (<any> window).loaderTestResults;
		}, null, timeout), undefined)
		.then(testFn, function () {
			throw new Error('loaderTestResult was not set.');
		});
}

const appMessage = 'app';

registerSuite({
	name: 'require',

	config: {
		baseUrl: {
			default() {
				return executeTest(this, './config/defaultConfig.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			explicit() {
				return executeTest(this, './config/baseUrl.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		},

		map: {
			star() {
				return executeTest(this, './config/map-star.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			simple() {
				return executeTest(this, './config/map-simple.html', function (results: any) {
					assert.strictEqual(results.app, appMessage, '"map1" module and dependency should load');
				});
			},

			hierarchy() {
				return executeTest(this, './config/map-hierarchy.html', function (results: any) {
					assert.strictEqual(results.app, 'app A', '"map2" module and dependency should load');
				});
			},

			merge() {
				return executeTest(this, './config/map-merge.html', function (results: any) {
					assert.strictEqual(results.map1App, appMessage, '"map1" module and dependency should load');
					assert.strictEqual(results.map2App, 'app A', '"map2" module and dependency should load');
				});
			},

			relative() {
				return executeTest(this, './config/map-relative.html', function (results: any) {
					assert.strictEqual(results.app, appMessage,
						'"relative1" module and dependency "common/app" should load');
				});
			},

			nested() {
				return executeTest(this, './config/map-nested.html', function (results: any) {
					assert.strictEqual(results.app, 'remappedapp',
						'"usesApp" module should get remapped "a/remappedApp" module');
					assert.strictEqual(results.remappedApp, 'remappedapp',
						'"remappedApp" module should get unmapped "app" module');
				});
			}

			// plugin() {
			// 	return executeTest(this, './config/map-plugin.html', function (results: any) {
			// 		assert.strictEqual(results.plugin1, 'plugin1', 'Plug-in module should load');
			// 		assert.strictEqual(results.plugin2, 'plugin2', 'Plug-in module should load');
			// 	});
			// }
		},

		packages: {
			'name and location'() {
				return executeTest(this, './config/packages1.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			'name, location and main'() {
				return executeTest(this, './config/packages2.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		},

		paths: {
			simple() {
				return executeTest(this, './config/paths1.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		}
	},

	has() {
		return executeTest(this, './has.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	toAbsMid() {
		return executeTest(this, './toAbsMid.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	toUrl() {
		return executeTest(this, './toUrl.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	undef() {
		return executeTest(this, './undef.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	}
});
