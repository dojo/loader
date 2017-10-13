const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import Test from 'intern/lib/Test';
import Command from '@theintern/leadfoot/Command';
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

function executeTest(suite: Test, htmlTestPath: string, testFn: (result: any) => void, timeout = 5000): Command<any> {
	return suite.remote
		.get(require.resolve(htmlTestPath))
		.then(pollUntil(function () {
			return (<any> window).loaderTestResults;
		}, undefined, timeout), undefined)
		.then(testFn, function () {
			throw new Error('loaderTestResult was not set.');
		});
}

const appMessage = 'app';

registerSuite('browser - require', {
	config: {
		baseUrl: {
			default(this: any) {
				return executeTest(this, './config/defaultConfig.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			explicit(this: any) {
				return executeTest(this, './config/baseUrl.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		},

		map: {
			star(this: any) {
				return executeTest(this, './config/map-star.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			simple(this: any) {
				return executeTest(this, './config/map-simple.html', function (results: any) {
					assert.strictEqual(results.app, appMessage, '"map1" module and dependency should load');
				});
			},

			hierarchy(this: any) {
				return executeTest(this, './config/map-hierarchy.html', function (results: any) {
					assert.strictEqual(results.app, 'app A', '"map2" module and dependency should load');
				});
			},

			merge(this: any) {
				return executeTest(this, './config/map-merge.html', function (results: any) {
					assert.strictEqual(results.map1App, appMessage, '"map1" module and dependency should load');
					assert.strictEqual(results.map2App, 'app A', '"map2" module and dependency should load');
				});
			},

			relative(this: any) {
				return executeTest(this, './config/map-relative.html', function (results: any) {
					assert.strictEqual(results.app, appMessage,
						'"relative1" module and dependency "common/app" should load');
				});
			},

			nested(this: any) {
				return executeTest(this, './config/map-nested.html', function (results: any) {
					assert.strictEqual(results.app, 'remappedapp',
						'"usesApp" module should get remapped "a/remappedApp" module');
					assert.strictEqual(results.remappedApp, 'remappedapp',
						'"remappedApp" module should get unmapped "app" module');
				});
			},

			plugin(this: any) {
				return executeTest(this, './config/map-plugin.html', function (results: any) {
					assert.strictEqual(results.plugin1, 'one', 'Plug-in module should load');
					assert.strictEqual(results.plugin2, 'two', 'Plug-in module should load');
				});
			}
		},

		packages: {
			'name and location'(this: any) {
				return executeTest(this, './config/packages1.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			'name, location and main'(this: any) {
				return executeTest(this, './config/packages2.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			'package name with slashes'(this: any) {
				return executeTest(this, './config/packages3.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			},

			'nested packages'(this: any) {
				return executeTest(this, './config/packages4.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		},

		paths: {
			simple(this: any) {
				return executeTest(this, './config/paths1.html', function (results: any) {
					assert.strictEqual(results, appMessage, '"app" module should load');
				});
			}
		}
	},

	plugin : {
		load(this: any) {
			return executeTest(this, './plugin-load.html', function (results: any) {
				assert.strictEqual(results, 'one', 'Plug-in module should load');
			});
		},
		config(this: any) {
			return executeTest(this, './plugin-config.html', function (results: any) {
				if (results !== 'success') {
					assert.fail(null, null, results);
				}
			});
		}
	},

	has(this: any) {
		return executeTest(this, './has.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	toAbsMid(this: any) {
		return executeTest(this, './toAbsMid.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	toUrl(this: any) {
		return executeTest(this, './toUrl.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	undef(this: any) {
		return executeTest(this, './undef.html', function (results: any) {
			if (results !== 'success') {
				assert.fail(null, null, results);
			}
		});
	},

	on: {
		error(this: any) {
			return executeTest(this, './on/error.html', function (results: any) {
				if (results !== 'success') {
					assert.fail(null, null, results);
				}
			});
		},

		remove(this: any) {
			return executeTest(this, './on/remove.html', function (results: any) {
				if (results !== 'success') {
					assert.fail(null, null, results);
				}
			});
		}
	}
});
