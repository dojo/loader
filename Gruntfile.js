/* jshint node:true */

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-uglify');

	require('grunt-dojo2').initConfig(grunt, {
		/* loader has to build in a slightly different way than the standard Dojo 2 package */
		ts: {
			tests: {
				compilerOptions: {
					module: 'umd'
				},
				outDir: '<%= devDirectory %>/tests',
				include: [ 'tests/**/*.ts', 'typings/index.d.ts', 'src/interfaces.d.ts' ]
			}
		},

		/* loader has minification built into the package, eventually this should be moved to grunt-dojo2 */
		uglify: {
			dist: {
				options: {
					banner: '/*! <%= name %>@<%= version %> - Copyright (c) 2016, The Dojo Foundation. ' +
						'All rights reserved. */',
					sourceMap: true,
					sourceMapName: 'dist/umd/loader.min.js.map',
					sourceMapIncludeSources: true,
					sourceMapIn: 'dist/umd/loader.js.map',
					compress: {
						dead_code: true,
						unsafe: true
					}
				},
				files: {
					'dist/umd/loader.min.js': 'dist/umd/loader.js'
				}
			}
		}
	});

	/* we have to write the dev task from the default because of the need to copy compile the tests differently */
	grunt.registerTask('dev', [
		'typings',
		'tslint',
		'clean:dev',
		'ts:dev',
		'ts:tests',
		'copy:staticTestFiles'
	]);

	/* we also have to add the uglify task */
	grunt.registerTask('dist', grunt.config.get('distTasks').concat('uglify:dist'));
};
