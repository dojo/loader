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
			dfd.resolve();
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
			// TODO
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
	},

	// TODO: is require.inspect worth testing?

	nodeRequire: {
	},

	signal: {
	},

	toAbsMid: {
	},

	toUrl: {
	},

	undef: {
	}
});
