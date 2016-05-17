/* jshint node:true */

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-uglify');

	require('grunt-dojo2').initConfig(grunt, {
		ts: {
			tests: {
				options: {
					module: 'umd'
				},
				outDir: '<%= devDirectory %>/tests',
				src: [ 'tests/**/*.ts', 'typings/main.d.ts', 'src/interfaces.d.ts' ]
			}
		},

		uglify: {
			dist: {
				options: {
					banner: '/*! <%= name %>@<%= version %> - Copyright (c) 2016, The Dojo Foundation. ' +
						'All rights reserved. */',
					sourceMap: true,
					sourceMapName: 'dist/umd/_debug/loader.min.js.map',
					sourceMapIncludeSources: true,
					sourceMapIn: 'dist/umd/_debug/loader.js.map',
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

	grunt.registerTask('dev', [
		'tslint',
		'clean:dev',
		'ts:dev',
		'ts:tests',
		'copy:staticTestFiles',
		'updateTsconfig'
	]);

	grunt.registerTask('dist', grunt.config.get('distTasks').concat('uglify:dist'));
};
