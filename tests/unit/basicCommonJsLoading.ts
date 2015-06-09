import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

const appMessage = 'Message from CommonJS app.';

let nodeRequire: Function;
let originalDefine: any;
let originalRequire: any;

registerSuite({
	name: 'basic CommonJS loading',

	setup() {
		nodeRequire = (<any> require).nodeRequire;
		originalDefine = global.define;
		originalRequire = global.require;
		global.define = null;
		global.require = null;
		nodeRequire((<any> require).toUrl('src/loader.js'));
		global.require.config({
			packages: [
				{
					name: 'commonJs',
					location: './tests/common/commonJs'
				}
			]
		});
	},

	teardown() {
		global.define = originalDefine;
		global.require = originalRequire;
	},

	'simple test'() {
		let dfd = this.async();

		global.require([
			'commonJs/app'
		], function (app: any) {
			assert.strictEqual(app.getMessage(), appMessage);
			dfd.resolve();
		});
	},

	'CommonJS module with ID'() {
		let dfd = this.async();

		global.require([
			'require',
			'commonJs/testModule1'
		], function (require: any) {
			let testModule1 = require('test/module1');

			assert.strictEqual(testModule1, 'testModule1', 'Test module should load and use explicit id');
			dfd.resolve();
		});
	},

	'CommonJS module with ID and dependency - ID'() {
		let dfd = this.async();

		global.require([
			'require',
			'commonJs/testModule1',
			'commonJs/testModule2'
		], function (require: any) {
			const expected = {
				testModule1Value: 'testModule1',
				testModule2Value: 'testModule2'
			};
			let testModule2 = require('test/module2');

			assert.strictEqual(testModule2, expected, 'Test modules should load and use explicit ids');
			dfd.resolve();
		});
	},

	'CommonJS module with ID and dependency - module'() {
		let dfd = this.async();

		global.require([
			'require',
			'commonJs/testModule3'
		], function (require: any) {
			const expected = {
				appModuleValue: appMessage,
				testModule3Value: 'testModule3'
			};
			let testModule3 = require('test/module3');

			assert.strictEqual(testModule3, expected, 'Test module and dependency should load');
			dfd.resolve();
		});
	},

	'CommonJS module without ID and dependency - id'() {
		let dfd = this.async();

		global.require([
			'commonJs/app1',
			'commonJs/testModule1'
		], function (app1: any) {
			const expected = {
				testModule1Value: 'testModule1',
				testModule2Value: 'testModule2'
			};

			assert.strictEqual(app1, 'testmodule1', 'Test module and dependency should load');
			dfd.resolve();
		});
	},

	'CommonJS module with circular dependency'() {
		let dfd = this.async();

		global.require([
			'commonJs/circular1'
		], function (circular1: any) {
			assert.strictEqual(circular1.getMessage(), 'circular1', 'Circular dependency should be resolved');
			assert.strictEqual(circular1.circular2Message, 'circular2', 'Circular dependency should be resolved')
			dfd.resolve();
		});
	},

	'CommonJS module with circular dependency 2'() {
		let dfd = this.async();

		global.require([
			'commonJs/circular2'
		], function (circular2: any) {
			assert.strictEqual(circular2.getMessage(), 'circular2', 'Circular dependency should be resolved');
			assert.strictEqual(circular2.circular1Message, 'circular1', 'Circular dependency should be resolved')
			dfd.resolve();
		});
	},

	'CommonJS module with circular dependency 3'() {
		let dfd = this.async();

		global.require([
			'commonJs/circular1',
			'commonJs/circular2'
		], function (circular1: any, circular2: any) {
			assert.strictEqual(circular1.getMessage(), 'circular1', 'Circular dependency should be resolved');
			assert.strictEqual(circular1.circular2Message, 'circular2', 'Circular dependency should be resolved')
			assert.strictEqual(circular2.getMessage(), 'circular2', 'Circular dependency should be resolved');
			assert.strictEqual(circular2.circular1Message, 'circular1', 'Circular dependency should be resolved')
			dfd.resolve();
		});
	},

	'CommonJS module with deep dependencies'() {
		let dfd = this.async();

		global.require([
			'commonJs/deep1'
		], function (deep1: any) {
			const expected = {
				objectExport: 'objectExport'
			};
			let obj = deep1();

			assert.isObject(obj, 'deep1() should create an object');
			assert.deepEqual(obj.deep3(), expected, 'deep3() should create an object');
			dfd.resolve();
		});
	}
});
