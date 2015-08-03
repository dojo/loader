import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

const timeout = 1000;

registerSuite({
	name: 'require',

	'only factory AMD require'() {
		let dfd = this.async(timeout);

		(<any> require)([
			'../../_build/tests/common/amd/onlyFactory'
		], dfd.callback(function (onlyFactory: any) {
			assert.strictEqual(onlyFactory.property, 'value', 'AMD module with no dependencies should load');
		}));
	},

	config: {
		baseUrl: {
			default() {
				let dfd = this.async(timeout);

				(<any> require)([
					'../../_build/tests/common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			explicit() {
				let dfd = this.async(timeout);

				(<any> require).config({
					baseUrl: '../../_build/tests'
				});

				(<any> require)([
					'common/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			}
		},

		map: {
			beforeEach() {
				(<any> require).config({
					baseUrl: './'
				});
			},

			star() {
				let dfd = this.async(timeout);

				(<any> require).config({
					map: {
						'*': {
							'mapped': '../../_build/tests/common'
						}
					}
				});

				(<any> require)([
					'mapped/app'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			},

			simple() {
				let dfd = this.async(timeout);

				(<any> require).config({
					map: {
						common: {
							mapped: '../../_build/tests/common'
						}
					},
					packages: [
						{
							name: 'common',
							location: '../../_build/tests/common'
						}
					]
				});

				(<any> require)([
					'common/map1'
				], dfd.callback(function (map1: any) {
					assert.strictEqual(map1.app, 'app', '"map1" module and dependency should load');
				}));
			},

			hierarchy() {
				let dfd = this.async(timeout);

				(<any> require).config({
					map: {
						common: {
							mapped: '../../_build/tests/common'
						},
						'common/a': {
							mapped: '../../_build/tests/common/a'
						}
					},
					packages: [
						{
							name: 'common',
							location: '../../_build/tests/common'
						}
					]
				});

				(<any> require)([
					'common/a/map2'
				], dfd.callback(function (map2: any) {
					assert.strictEqual(map2.app, 'app A', '"map2" module and dependency should load');
				}));
			},

			relative() {
				let dfd = this.async(timeout);

				(<any> require).config({
					map: {
						'common/a': {
							'common/a': '../../_build/tests/common'
						}
					},
					packages: [
						{
							name: 'common',
							location: '../../_build/tests/common'
						}
					]
				});

				(<any> require)([
					'common/a/relative1'
				], dfd.callback(function (relative1: any) {
					assert.strictEqual(relative1.app, 'app',
						'"relative1" module and dependency "common/app" should load');
				}));
			}
		},

		packages: {
			beforeEach() {
				(<any> require).config({
					baseUrl: './'
				});
			},

			'name, location and main'() {
				let dfd = this.async(timeout);

				(<any> require).config({
					packages: [
						{
							name: 'common',
							location: '../../_build/tests/common',
							main: 'app'
						}
					]
				});

				(<any> require)([
					'common'
				], dfd.callback(function (app: any) {
					assert.strictEqual(app, 'app', '"app" module should load');
				}));
			}
		}
	}
});
