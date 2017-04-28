import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

const DEFAULT_TIMEOUT = 1000;

let globalErrorHandler: any;
let nodeRequire: NodeRequire;
let originalDefine: any;
let originalRequire: any;
let onErrorHandler: any;

function setErrorHandler(dfd: any) {
	(<any> process)._events.uncaughtException = function (error: Error) {
		dfd.reject(error);
	};
}

function reloadLoader() {
	let loaderPath = (<any> require).toUrl('src/loader.js');

	global.define = <any> null;
	global.require = <any> null;
	delete nodeRequire.cache[nodeRequire.resolve(loaderPath)];
	nodeRequire(loaderPath);
}

registerSuite({
	name: 'require',

	setup() {
		nodeRequire = (<any> require).nodeRequire;
		originalDefine = global.define;
		originalRequire = global.require;
	},

	teardown() {
		global.define = originalDefine;
		global.require = originalRequire;
	},

	beforeEach() {
		// Do this before each test to ensure a clean loader environment with empty cache
		reloadLoader();

		// Need to handle global errors to catch errors thrown by 'require' or 'define'
		// otherwise the whole test suite dies
		// Note: process.on('uncaughtException') does not work
		globalErrorHandler = (<any> process)._events.uncaughtException;
		delete (<any> process)._events.uncaughtException;
	},

	afterEach() {
		(<any> process)._events.uncaughtException = globalErrorHandler;
		if (onErrorHandler) {
			onErrorHandler.remove();
			onErrorHandler = undefined;
		}
	},

	'node modules'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		setErrorHandler(dfd);

		global.require([
			// This module exists in the "node_modules" folder, so the loader will fail to locate it, but should
			// use the Node.js 'require' to load it, which should succeed (since Node.js automatically checks
			// the "node_modules" folder)
			'grunt/lib/grunt/option',
			'_build/tests/common/app'
		], dfd.callback(function (gruntOption: any, app: any) {
			assert.isFunction(gruntOption, '"grunt/option" module should load and be a function');
			assert.isFunction(gruntOption.init, '"grunt/option" module should load and be valid');
			assert.strictEqual(app, 'app', '"app" module should load');
		}));
	},

	'node modules sync'() {
		const events: any = global.require('events');
		assert.isNotNull(events);
		assert.isNotNull(events.EventEmitter);
	},

	'node modules sync multiples'() {
		const events: any = global.require('events');
		assert.isNotNull(events);
		assert.isNotNull(events.EventEmitter);

		const eventsAgain = global.require('events');
		assert.strictEqual(eventsAgain, events);
	},

	'non-existent module'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		(<any> process)._events.uncaughtException = function (error: Error) {
			if (error.message.indexOf('bad/module/id') === -1) {
				dfd.reject(error);
			}
			else {
				dfd.resolve();
			}
		};

		global.require([
			'bad/module/id'
		], dfd.rejectOnError(function (gruntOption: any, app: any) {
			assert.fail(null, null, 'Dependency with bad module id should not be resolved');
		}));
	},

	'non-existent module sync'() {
		assert.throws(function () {
			global.require('thisIsNotAValidNodeModule');
		});
	},

	'non-existent module with on-error listener should not throw error'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);
		let badMid = 'bad/module/id';

		(<any> process)._events.uncaughtException = function (error: Error) {
			if (error.message.indexOf(badMid) > -1) {
				dfd.reject(error);
			}
		};

		onErrorHandler = global.require.on('error', dfd.callback(function noop(error: DojoLoader.LoaderError) {}));

		global.require([
			badMid
		], function () {
			dfd.reject(new Error('Dependency with bad module id should not be resolved'));
		});
	},

	'non-existent module with on-error listener should fire callback'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);
		let badMid = 'bad/module/id';

		onErrorHandler = global.require.on('error', dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.isTrue(error.message.indexOf(badMid) > -1,
				'Callback should fire and message should contain bad mid');
		}));

		global.require([
			badMid
		], function () {
			dfd.reject(new Error('Dependency with bad module id should not be resolved'));
		});
	},

	'non-existent module with on-error listener should provide info'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);
		let badMid = 'bad/module/id';

		onErrorHandler = global.require.on('error', dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.strictEqual(error.src, 'dojo/loader', 'Error should be marked as from the loader');
			assert.isObject(error.info, 'Error should be supplemented with info');
			assert.strictEqual(error.info.module.mid, badMid, 'Error should be related to the bad module');
			assert.strictEqual(error.info.url, badMid + '.js', 'Error should contain the URL of the bad module');
		}));

		global.require([
			badMid
		], function () {
			dfd.reject(new Error('Dependency with bad module id should not be resolved'));
		});
	},

	'specific module errors are reported'(this: any) {
		let badMid = 'tests/unit/bad-module';
		let dfd = this.async();

		onErrorHandler = global.require.on('error', dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.include(error.info.details || '', 'Unexpected token');
		}));

		global.require([
			badMid
		], function () {
			dfd.reject('Should not have resolved');
		});
	},

	'missing module errors are reported'(this: any) {
		let badMid = 'bad/module/id';
		let dfd = this.async();

		onErrorHandler = global.require.on('error', dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.include(error.info.details || '', 'Cannot find module');
		}));

		global.require([
			badMid
		], function () {
			dfd.reject('Should not have resolved');
		});
	},

	'on-error listener should be removable'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);
		let badMid = 'bad/module/id';

		onErrorHandler = global.require.on('error', dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.fail(null, null, 'on-error callback should not have fired');
		}));
		onErrorHandler.remove();

		(<any> process)._events.uncaughtException = dfd.callback(function (error: DojoLoader.LoaderError) {
			assert.isTrue(error.message.indexOf(badMid) > -1, 'Error should be related to bad module');
		});

		global.require([
			badMid
		], function () {
			dfd.reject(new Error('Dependency with bad module id should not be resolved'));
		});
	},

	'only factory AMD require'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		setErrorHandler(dfd);

		global.require([
			'_build/tests/common/amd/onlyFactory'
		], dfd.callback(function (onlyFactory: any) {
			assert.strictEqual(onlyFactory.property, 'value', 'AMD module with no dependencies should load');
		}));
	},

	config: {
		baseUrl: {
			default(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require([
					'_build/tests/common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			explicit(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					baseUrl: './_build/tests'
				});

				global.require([
					'common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			}
		},

		map: {
			star(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						'*': {
							'mapped': './_build/tests/common'
						}
					}
				});

				global.require([
					'mapped/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			simple(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						common: {
							mapped: './_build/tests/common'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'common/map1'
				], dfd.callback(function (map1: any) {
					assert.strictEqual(map1.app, 'app', '"map1" module and dependency should load');
				}));
			},

			hierarchy(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						common: {
							mapped: './_build/tests/common'
						},
						'common/a': {
							mapped: './_build/tests/common/a'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'common/a/map2'
				], dfd.callback(function (map2: any) {
					assert.strictEqual(map2.app, 'app A', '"map2" module and dependency should load');
				}));
			},

			merge(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						common: {
							mapped: './_build/tests/common'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require.config({
					map: {
						'common/a': {
							mapped: './_build/tests/common/a'
						}
					}
				});

				global.require([
					'common/map1',
					'common/a/map2'
				], dfd.callback(function (map1: any, map2: any) {
					assert.strictEqual(map1.app, 'app', '"map1" module and dependency should load');
					assert.strictEqual(map2.app, 'app A', '"map2" module and dependency should load');
				}));
			},

			relative(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						'common/a': {
							'common/a': './_build/tests/common'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'common/a/relative1'
				], dfd.callback(function (relative1: any) {
					assert.strictEqual(relative1.app, 'app',
						'"relative1" module and dependency "common/app" should load');
				}));
			},

			nested(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						'*': {
							'common/app': 'common/a/remappedApp'
						},
						'common/a/remappedApp': {
							'common/app': 'common/app'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'common/usesApp',
					'common/a/remappedApp'
				], dfd.callback(function (app: any, remappedApp: any) {
					assert.strictEqual(app, 'remappedapp',
						'"usesApp" module should get remapped "a/remappedApp" module');
					assert.strictEqual(remappedApp, 'remappedapp',
						'"remappedApp" module should get unmapped "app" module');
				}));
			},

			plugin(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						'*': {
							plugin: 'common/plugin',
							plugin2: 'common/plugin!two'
						}
					},
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'plugin!one',
					'plugin2'
				], dfd.callback(function (plugin1: any, plugin2: any) {
					assert.strictEqual(plugin1, 'one', 'Plug-in module should load');
					assert.strictEqual(plugin2, 'two', 'Plug-in module should load');
				}));
			}
		},

		packages: {
			'name and location'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					packages: [
						{
							name: 'common',
							location: './_build/tests/common'
						}
					]
				});

				global.require([
					'common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			'name, location and main'(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					packages: [
						{
							name: 'common',
							location: './_build/tests/common',
							main: 'app'
						}
					]
				});

				global.require([
					'common'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			}
		},

		paths: {
			simple(this: any) {
				let dfd = this.async(DEFAULT_TIMEOUT);

				setErrorHandler(dfd);

				global.require.config({
					paths: {
						common: '_build/tests/common'
					}
				});

				global.require([
					'common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			}
		}
	},

	has: {
		'has API is available'() {
			assert.instanceOf(global.require.has, Function, '\'require.has\' should be a function');
			assert.instanceOf(global.require.has.add, Function, '\'require.has.add\' should be a function');
		},

		'add'() {
			global.require.has.add('test1', 'test1');
			assert.strictEqual(global.require.has('test1'), 'test1');
			assert.isUndefined(global.require.has('test2'), 'Undefined test should be undefined');

			global.require.has.add('test1', 'NEW VALUE');
			assert.strictEqual(global.require.has('test1'), 'test1', 'Re-adding same-name test should fail');

			global.require.has.add('test1', 'NEW VALUE', false, true);
			assert.strictEqual(global.require.has('test1'), 'NEW VALUE',
				'Re-adding same-name test with force parameter should succeed');

			let runCount = 0;
			global.require.has.add('test2', function () {
				runCount += 1;
				return runCount;
			});
			assert.strictEqual(runCount, 0, 'has test should not execute immediately');

			global.require.has.add('test3', function () {
				runCount += 1;
				return runCount;
			}, true);
			assert.strictEqual(runCount, 1, 'has test with \'now\' parameter should execute immediately');

			assert.strictEqual(global.require.has('test2'), 2);
			assert.strictEqual(runCount, 2);
			assert.strictEqual(global.require.has('test3'), 1, 'Re-running has test should use cached value');
			assert.strictEqual(runCount, 2);
		}
	},

	nodeRequire() {
		assert.isFunction(global.require.nodeRequire, '"require.nodeRequire" should be a function');
		assert.isNotNull((<any> global.require('events')).EventEmitter, '"require.nodeRequire" should load module');
	},

	toAbsMid(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		setErrorHandler(dfd);

		// Put the test in its own module so we can use context require
		global.define('common/a/toAbsMidTest', [
			'require'
		], dfd.callback(function (contextRequire: any) {
			assert.strictEqual(global.require.toAbsMid('mid'), 'mid');
			assert.strictEqual(global.require.toAbsMid('./mid'), 'mid');
			assert.strictEqual(global.require.toAbsMid('common/mid'), 'common/mid');

			assert.strictEqual(contextRequire.toAbsMid('mid'), 'mid');
			assert.strictEqual(contextRequire.toAbsMid('./mid'), 'common/a/mid');
			assert.strictEqual(contextRequire.toAbsMid('../mid'), 'common/mid');
			assert.strictEqual(contextRequire.toAbsMid('package/mid'), 'package/mid');
			assert.strictEqual(contextRequire.toAbsMid('./package/mid'), 'common/a/package/mid');
			assert.strictEqual(contextRequire.toAbsMid('../package/mid'), 'common/package/mid');
		}));

		global.require.config({
			baseUrl: './_build/tests'
		});

		global.require([
			'common/a/toAbsMidTest'
		], () => {});
	},

	toUrl(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		setErrorHandler(dfd);

		// Put the test in its own module so we can use context require
		global.define('common/a/toUrlTest', [
			'require'
		], dfd.callback(function (contextRequire: any) {
			assert.strictEqual(global.require.toUrl('mid'), '_build/tests/mid');
			assert.strictEqual(global.require.toUrl('./mid'), '_build/tests/mid');
			assert.strictEqual(global.require.toUrl('common/mid'), '_build/tests/common/mid');

			assert.strictEqual(contextRequire.toUrl('mid'), '_build/tests/mid');
			assert.strictEqual(contextRequire.toUrl('./mid'), '_build/tests/common/a/mid');
			assert.strictEqual(contextRequire.toUrl('../mid'), '_build/tests/common/mid');
			assert.strictEqual(contextRequire.toUrl('package/mid'), '_build/tests/package/mid');
			assert.strictEqual(contextRequire.toUrl('./package/mid'), '_build/tests/common/a/package/mid');
			assert.strictEqual(contextRequire.toUrl('../package/mid'), '_build/tests/common/package/mid');
		}));

		global.require.config({
			baseUrl: './_build/tests'
		});

		global.require([
			'common/a/toUrlTest'
		], () => {});
	},

	undef(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		(<any> process)._events.uncaughtException = function (error: Error) {
			if (error.message.indexOf('common/app') === -1) {
				dfd.reject(error);
			}
			else {
				dfd.resolve();
			}
		};

		global.require.config({
			packages: [
				{
					name: 'common',
					location: './_build/tests/common'
				}
			]
		});

		global.require([
			'common/app'
		], function () {
			global.require.undef('common/app');
			global.require('common/app');
			dfd.reject('Loading undefined module should throw an error');
		});
	},

	'recurisve undef': {
		'dependencies are unloaded'(this: any) {
			let dfd = this.async(DEFAULT_TIMEOUT);

			global.require.config({
				packages: [
					{
						name: 'recursive',
						location: './_build/tests/common/recursive'
					}
				]
			});

			function checkForUndef(mod: string): boolean {
				try {
					global.require(mod);
				}
				catch (error) {
					if (error.message.indexOf(mod) !== -1) {
						return true;
					}
				}
				return false;
			}

			global.require([
				'recursive/a'
			], function () {
				global.require.undef('recursive/a', true);
				const deps: string[] = [ 'recursive/a', 'recursive/b', 'recursive/c', 'recursive/d', 'recursive/e' ];
				const passed: boolean = deps.every(function (mod: string) {
					return checkForUndef(mod);
				});
				if (passed) {
					dfd.resolve();
				}
				else {
					dfd.reject('not all dependencies were undefined');
				}
			});
		},

		'modules without dependencies work as expected'() {
			global.require.undef('invalid-module', true);
		}
	},

	'important modules are not undefined'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		global.define('undef-module', ['require', 'module', 'exports'], (require: any, module: any, exports: any) => {
			return {
				require,
				module,
				exports
			};
		});

		global.require(['undef-module'], function () {
			global.require.undef('undef-module', true);

			global.define('undef-module-2', ['require', 'module', 'exports'], (require: any, module: any, exports: any) => {
				return {
					require,
					module,
					exports
				};
			});

			assert.doesNotThrow(() => {
				global.require(['undef-module-2'], dfd.callback((defs: any) => {
					assert.isTrue(defs.require !== undefined);
					assert.isTrue(defs.module !== undefined);
					assert.isTrue(defs.exports !== undefined);
				}));
			});
		});
	},

	'cache injected module is properly undefined'(this: any) {
		let dfd = this.async(DEFAULT_TIMEOUT);

		global.require.config({
			packages: [
				{
					name: 'common',
					location: './_build/tests/common'
				}
			]
		});

		global.require.cache({
			'common/app'() {
				define([], () => {
					return 'mock';
				});
			}
		});

		global.require.cache({}); /* TODO: Remove when #124 resolve */

		global.require([
			'common/app'
		], dfd.callback(function (app: any) {
			assert.strictEqual(app, 'mock', 'should return cache factory value');
			global.require.undef('common/app');
			assert.throws(() => {
				global.require('common/app');
			}, Error, 'Attempt to require unloaded module');
		}));
	},

	plugin: {
		load(this: any) {
			const dfd = this.async(DEFAULT_TIMEOUT);

			global.require.config({
				paths: {
					common: '_build/tests/common'
				}
			});

			global.require([
				'common/plugin!one'
			], dfd.callback(function (pluginOne: any) {
				assert.strictEqual(pluginOne, 'one', 'Plugin should return one');
			}));
		},

		config(this: any) {
			const dfd = this.async(DEFAULT_TIMEOUT);
			const paths: { [path: string]: string } = {
				common: '_build/tests/common'
			};

			global.require.config({ paths });

			global.require([
				'common/pluginConfig!one'
			], dfd.callback(function (pluginConfig: any) {
				assert.property(pluginConfig, 'baseUrl', 'Base URL should be present');
				assert.deepEqual(pluginConfig.paths, paths,
					'Plugin should have received config param equal to require config');
			}));
		},

		mergedConfig(this: any) {
			const dfd = this.async(DEFAULT_TIMEOUT);
			const paths: { [path: string]: string }  = {
				common: '_build/tests/common'
			};
			const map: DojoLoader.ModuleMap = {
				foo: 'bar'
			};

			global.require.config({ paths });
			global.require.config({ map });

			global.require([
				'common/pluginConfig!one'
			], dfd.callback(function (pluginConfig: any) {
				assert.deepEqual(pluginConfig.paths, paths, 'Paths should be equal');
				assert.deepEqual(pluginConfig.map, map, 'Map should be equal');
			}));
		},

		relativePluginPaths(this: any) {
			const dfd = this.async(DEFAULT_TIMEOUT);

			global.require.config({
				paths: {
					common: '_build/tests/common'
				}
			});

			global.require([
				'common/plugin!../../location'
			], dfd.callback(function (pluginLocation: any) {
				assert.strictEqual(pluginLocation, '../../location', 'Plugin should return location it was passed correctly');
			}));
		}
	}
});
