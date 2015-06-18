import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

const timeout = 1000;

let globalErrorHandler: any;
let nodeRequire: Function;
let originalDefine: any;
let originalRequire: any;

function setErrorHandler(dfd: any) {
	(<any> process)._events.uncaughtException = function (error: Error) {
		dfd.reject(error);
	};
}

function reloadLoader() {
	let loaderPath = (<any> require).toUrl('src/loader.js');

	global.define = null;
	global.require = null;
	delete (<any> nodeRequire).cache[(<any> nodeRequire).resolve(loaderPath)];
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
	},

	'node modules'() {
		let dfd = this.async(timeout);

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
		const events = global.require('events');
		assert.isNotNull(events);
		assert.isNotNull(events.EventEmitter);
	},

	'node modules sync multiples'() {
		const events = global.require('events');
		assert.isNotNull(events);
		assert.isNotNull(events.EventEmitter);

		const eventsAgain = global.require('events');
		assert.strictEqual(eventsAgain, events);
	},

	'non-existent module'() {
		let dfd = this.async(timeout);

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

	config: {
		baseUrl: {
			default() {
				let dfd = this.async(timeout);

				setErrorHandler(dfd);

				global.require([
					'_build/tests/common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			explicit() {
				let dfd = this.async(timeout);

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
			star() {
				let dfd = this.async(timeout);

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

			simple() {
				let dfd = this.async(timeout);

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

			hierarchy() {
				let dfd = this.async(timeout);

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
					assert.strictEqual(map2.app, 'app A', '"map1" module and dependency should load');
				}));
			},

			merge() {
				let dfd = this.async(timeout);

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

				global.require({
					map: {
						'common/a': {
							mapped: './_build/tests/common/a'
						}
					}
				}, [
					'common/map1',
					'common/a/map2'
				], dfd.callback(function (map1: any, map2: any) {
					assert.strictEqual(map1.app, 'app', '"map1" module and dependency should load');
					assert.strictEqual(map2.app, 'app A', '"amap1" module and dependency should load');
				}));
			},

			relative() {
				let dfd = this.async(timeout);

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

			nested() {
				let dfd = this.async(timeout);

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

			plugin() {
				let dfd = this.async(timeout);

				setErrorHandler(dfd);

				global.require.config({
					map: {
						'*': {
							plugin1: 'common/plugin!one',
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
					'plugin1',
					'plugin2'
				], dfd.callback(function (plugin1: any, plugin2: any) {
					assert.strictEqual(plugin1, 'one', 'Plug-in module should load');
					assert.strictEqual(plugin2, 'two', 'Plug-in module should load');
				}));
			}
		},

		packages: {
			'name and location'() {
				let dfd = this.async(timeout);

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

			'name, location and main'() {
				let dfd = this.async(timeout);

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
			simple() {
				let dfd = this.async(timeout);

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

	// TODO: is require.inspect worth testing? (it just calls eval)

	nodeRequire() {
		assert.isFunction(global.require.nodeRequire, '"require.nodeRequire" should be a function');
		assert.isNotNull(global.require('events').EventEmitter, '"require.nodeRequire" should load module');
	},

	toAbsMid() {
		let dfd = this.async(timeout);

		setErrorHandler(dfd);

		global.define('toAbsMidTest', [], function () {
			return {
				assert: assert,
				dfd: dfd
			};
		});

		global.require.config({
			baseUrl: './_build/tests'
		});

		global.require([
			'common/a/toAbsMid'
		]);
	},

	toUrl() {
		let dfd = this.async(timeout);

		setErrorHandler(dfd);

		global.define('toUrlTest', [], function () {
			return {
				assert: assert,
				dfd: dfd
			};
		});

		global.require.config({
			baseUrl: './_build/tests'
		});

		global.require([
			'common/a/toUrl'
		]);
	},

	undef() {
		let dfd = this.async(timeout);

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
			let app: any = global.require('common/app');
			dfd.reject('Loading undefined module should throw an error');
		});
	}
});
