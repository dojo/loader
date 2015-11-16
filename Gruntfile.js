/* jshint node:true */

function mixin(destination, source) {
	for (var key in source) {
		destination[key] = source[key];
	}
	return destination;
}

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-ts');
	grunt.loadNpmTasks('grunt-tslint');
	grunt.loadNpmTasks('dts-generator');
	grunt.loadNpmTasks('intern');
	grunt.loadNpmTasks('remap-istanbul');

	var tsconfigContent = grunt.file.read('tsconfig.json');
	var tsconfig = JSON.parse(tsconfigContent);
	var tsOptions = mixin({}, tsconfig.compilerOptions, {
		failOnTypeErrors: true,
		fast: 'never'
	});
	var compilerOptions = mixin({}, tsconfig.compilerOptions);
	tsconfig.filesGlob = tsconfig.filesGlob.map(function (glob) {
		if (/^\.\//.test(glob)) {
			// Remove the leading './' from the glob because grunt-ts
			// sees it and thinks it needs to create a .baseDir.ts which
			// messes up the "dist" compilation
			return glob.slice(2);
		}
		return glob;
	});
	var packageJson = grunt.file.readJSON('package.json');

	grunt.initConfig({
		name: packageJson.name,
		version: packageJson.version,
		tsconfig: tsconfig,
		all: [ '<%= tsconfig.filesGlob %>' ],
		skipTests: [ '<%= all %>' , '!tests/**/*.ts' ],
		staticTestFiles: 'tests/**/*.{html,css,js}',
		devDirectory: '<%= tsconfig.compilerOptions.outDir %>',
		istanbulIgnoreNext: '/* istanbul ignore next */',

		clean: {
			dist: {
				src: [ 'dist/' ]
			},
			dev: {
				src: [ '<%= devDirectory %>' ]
			},
			src: {
				src: [ '{src,tests}/**/*.js' ],
				filter: function (path) {
					// Only clean the .js file if a .js.map file also exists
					var mapPath = path + '.map';
					if (grunt.file.exists(mapPath)) {
						grunt.file.delete(mapPath);
						return true;
					}
					return false;
				}
			},
			coverage: {
				src: [ 'html-report/', 'coverage*.json', 'lcov.info' ]
			}
		},

		copy: {
			staticFiles: {
				expand: true,
				cwd: '.',
				src: [ 'README.md', 'LICENSE', 'package.json', 'bower.json' ],
				dest: 'dist/'
			},
			staticTestFiles: {
				expand: true,
				cwd: '.',
				src: [ '<%= staticTestFiles %>' ],
				dest: '<%= devDirectory %>'
			},
			typings: {
				expand: true,
				cwd: 'typings/',
				src: [ '**/*.d.ts', '!tsd.d.ts' ],
				dest: 'dist/typings/'
			}
		},

		dtsGenerator: {
			options: {
				baseDir: 'src',
				name: '<%= name %>'
			},
			dist: {
				options: {
					out: 'dist/typings/<%= name %>/<%= name %>-<%= version %>.d.ts'
				},
				src: [ '<%= skipTests %>' ]
			}
		},

		exec: {
			codecov: 'cat coverage-final.json | ./node_modules/.bin/codecov'
		},

		intern: {
			options: {
				grep: grunt.option('grep') || '.*',
				runType: 'runner',
				config: '<%= devDirectory %>/tests/intern'
			},
			runner: {
				options: {
					reporters: [
						'Combined',
						{
							id: 'node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage',
							filename: 'coverage-runner.json'
						}
					]
				}
			},
			local: {
				options: {
					config: '<%= devDirectory %>/tests/intern-local',
					reporters: [ 'Runner', 'LcovHtml' ]
				}
			},
			client: {
				options: {
					runType: 'client',
					reporters: [
						'Combined',
						{
							id: 'node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage',
							filename: 'coverage-client.json'
						}
					]
				}
			},
			proxy: {
				options: {
					proxyOnly: true
				}
			}
		},

		remapIstanbul: {
			options: {
				reports: {
					'text': undefined,
					'html': 'html-report',
					'lcovonly': 'lcov.info',
					'json': 'coverage-final.json'
				}
			},
			client: {
				src: [ 'coverage-client.json' ]
			},
			runner: {
				src: [ 'coverage-runner.json' ]
			},
			combined: {
				src: [ 'coverage-client.json', 'coverage-runner.json' ]
			}
		},

		rename: {
			sourceMaps: {
				expand: true,
				cwd: 'dist/',
				src: [ '**/*.js.map', '!_debug/**/*.js.map' ],
				dest: 'dist/_debug/'
			}
		},

		rewriteSourceMaps: {
			dist: {
				src: [ 'dist/_debug/**/*.js.map' ]
			}
		},

		replace: {
			addIstanbulIgnore: {
				src: [ '<%= devDirectory %>/**/*.js' ],
				overwrite: true,
				replacements: [
					{
						from: /^(var __(?:extends|decorate) = )/gm,
						to: '$1<%= istanbulIgnoreNext %> '
					},
					{
						from: /^(\()(function \(deps, )/m,
						to: '$1<%= istanbulIgnoreNext %> $2'
					}
				]
			}
		},

		ts: {
			options: tsOptions,
			dev: {
				outDir: '<%= devDirectory %>',
				src: [ '<%= all %>' ]
			},
			tests: {
				options: {
					module: 'amd'
				},
				outDir: '<%= devDirectory %>/tests',
				src: [ 'tests/**/*.ts', 'typings/tsd.d.ts' ]
			},
			dist: {
				options: {
					mapRoot: '../dist/_debug'
				},
				outDir: 'dist',
				src: [ '<%= skipTests %>' ]
			}
		},

		tslint: {
			options: {
				configuration: grunt.file.readJSON('tslint.json')
			},
			src: {
				src: [
					'<%= all %>',
					'!typings/**/*.ts',
					'!tests/typings/**/*.ts'
				]
			}
		},

		watch: {
			grunt: {
				options: {
					reload: true
				},
				files: [ 'Gruntfile.js', 'tsconfig.json' ]
			},
			src: {
				options: {
					atBegin: true
				},
				files: [ '<%= all %>', '<%= staticTestFiles %>' ],
				tasks: [
					'dev'
				]
			}
		}
	});

	grunt.registerMultiTask('rewriteSourceMaps', function () {
		this.filesSrc.forEach(function (file) {
			var map = JSON.parse(grunt.file.read(file));
			var sourcesContent = map.sourcesContent = [];
			var path = require('path');
			map.sources = map.sources.map(function (source, index) {
				sourcesContent[index] = grunt.file.read(path.resolve(path.dirname(file), source));
				return source.replace(/^.*\/src\//, '');
			});
			grunt.file.write(file, JSON.stringify(map));
		});
		grunt.log.writeln('Rewrote ' + this.filesSrc.length + ' source maps');
	});

	grunt.registerMultiTask('rename', function () {
		this.files.forEach(function (file) {
			if (grunt.file.isFile(file.src[0])) {
				grunt.file.mkdir(require('path').dirname(file.dest));
			}
			require('fs').renameSync(file.src[0], file.dest);
			grunt.verbose.writeln('Renamed ' + file.src[0] + ' to ' + file.dest);
		});
		grunt.log.writeln('Moved ' + this.files.length + ' files');
	});

	grunt.registerTask('updateTsconfig', function () {
		var tsconfig = JSON.parse(tsconfigContent);
		tsconfig.files = grunt.file.expand(tsconfig.filesGlob);

		var output = JSON.stringify(tsconfig, null, '\t') + require('os').EOL;
		if (output !== tsconfigContent) {
			grunt.file.write('tsconfig.json', output);
			tsconfigContent = output;
		}
	});

	grunt.registerTask('coverage', [
		'remapIstanbul:combined',
		'exec:codecov'
	]);
	grunt.registerTask('dev', [
		'ts:dev',
		'ts:tests',
		'copy:staticTestFiles',
		'replace:addIstanbulIgnore',
		'updateTsconfig'
	]);
	grunt.registerTask('dist', [
		'ts:dist',
		'rename:sourceMaps',
		'rewriteSourceMaps',
		'copy:typings',
		'copy:staticFiles',
		'dtsGenerator:dist'
	]);
	grunt.registerTask('test', [ 'dev', 'intern:client' ]);
	grunt.registerTask('test-local', [ 'dev', 'intern:local' ]);
	grunt.registerTask('test-proxy', [ 'dev', 'intern:proxy' ]);
	grunt.registerTask('ci', [ 'tslint', 'dev', 'intern:client', 'intern:runner', 'coverage', 'clean' ]);
	grunt.registerTask('default', [ 'clean', 'dev' ]);
};
