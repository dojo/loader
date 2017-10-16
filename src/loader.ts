'use strict';
import ModuleShim = DojoLoader.ModuleShim;
import Module = DojoLoader.Module;
import Package = DojoLoader.Package;

declare const load: (module: string) => any;
declare const Packages: {} | undefined;
declare const importScripts: ((url: string) => void);

(function (args?: string[]): void {
	let globalObject: any = (function (): any {
		if (typeof window !== 'undefined') {
			// Browsers
			return window;
		}
		else if (typeof global !== 'undefined') {
			// Node
			return global;
		}
		else if (typeof self !== 'undefined') {
			// Web workers
			return self;
		}
		return {};
	})();

	const EXECUTING = 'executing';
	const ABORT_EXECUTION: Object = {};
	//
	// loader state data
	//

	// hash: (mid | url)-->(function | string)
	//
	// A cache of resources. The resources arrive via a require.cache application, which takes a hash from either
	// mid --> function or url --> string. The function associated with mid keys causes the same code to execute as if
	// the module was script injected.
	//
	// Both kinds of key-value pairs are entered into cache via the function consumePendingCache, which may relocate
	// keys as given by any mappings *iff* the cache was received as part of a module resource request.
	let cache: DojoLoader.ObjectMap = {};

	let checkCompleteGuard = 0;

	// The configuration passed to the loader
	let config: DojoLoader.Config = {
		baseUrl: './',
		packages: [],
		paths: {},
		pkgs: {},
		shim: {},
		crossOrigin: false
	};

	// The arguments sent to loader via AMD define().
	let moduleDefinitionArguments: DojoLoader.ModuleDefinitionArguments | undefined = undefined;

	// The list of modules that need to be evaluated.
	let executionQueue: DojoLoader.Module[] = [];

	let executedSomething = false;

	let injectUrl: (url: string, callback: (node?: HTMLScriptElement) => void, module: DojoLoader.Module, parent?: DojoLoader.Module) => void;

	// array of quads as described by computeMapProg; map-key is AMD map key, map-value is AMD map value
	let mapPrograms: DojoLoader.MapRoot = [];

	// A hash: (mid) --> (module-object) the module namespace
	//
	// pid: the package identifier to which the module belongs (e.g., "dojo"); "" indicates the system or default
	// 	package
	// mid: the fully-resolved (i.e., mappings have been applied) module identifier without the package identifier
	// 	(e.g., "dojo/io/script")
	// url: the URL from which the module was retrieved
	// pack: the package object of the package to which the module belongs
	// executed: false => not executed; EXECUTING => in the process of tranversing deps and running factory;
	// 	true => factory has been executed
	// deps: the dependency array for this module (array of modules objects)
	// def: the factory for this module
	// result: the result of the running the factory for this module
	// injected: true => module has been injected
	// load, normalize: plugin functions applicable only for plugins
	//
	// Modules go through several phases in creation:
	//
	// 1. Requested: some other module's definition or a require application contained the requested module in
	//    its dependency array
	//
	// 2. Injected: a script element has been appended to the insert-point element demanding the resource implied by
	//    the URL
	//
	// 3. Loaded: the resource injected in [2] has been evaluated.
	//
	// 4. Defined: the resource contained a define statement that advised the loader about the module.
	//
	// 5. Evaluated: the module was defined via define and the loader has evaluated the factory and computed a result.
	let modules: { [ moduleId: string ]: DojoLoader.Module | undefined; } = {};

	// list of (from-path, to-path, regex, length) derived from paths;
	// a "program" to apply paths; see computeMapProg
	let pathMapPrograms: DojoLoader.PathMap[] = [];

	let setGlobals: (require: DojoLoader.RootRequire, define: DojoLoader.Define) => void;

	let uidGenerator = 0;

	// the number of modules the loader has injected but has not seen defined
	let waitingCount = 0;

	const has: DojoLoader.Has = (function (): DojoLoader.Has {
		const hasCache: { [ name: string ]: any; } = Object.create(null);
		const global: Window = globalObject;
		const document: HTMLDocument = global.document;
		const element: HTMLDivElement = document && document.createElement('div');

		const has: DojoLoader.Has = <DojoLoader.Has> function(name: string): any {
			return typeof hasCache[name] === 'function' ?
				(hasCache[name] = hasCache[name](global, document, element)) : hasCache[name];
		};

		has.add = function (name: string, test: any, now: boolean, force: boolean): void {
			(!(name in hasCache) || force) && (hasCache[name] = test);
			now && has(name);
		};

		return has;
	})();

	const requireModule: DojoLoader.RootRequire =
		<DojoLoader.RootRequire> function (dependencies: any, callback?: DojoLoader.RequireCallback): DojoLoader.Module {
			return contextRequire(dependencies, callback);
		};

	const listenerQueues: { [queue: string]: ((...args: any[]) => void)[] } = {};

	const emit = function(type: DojoLoader.SignalType, args: {}): number | boolean {
		let queue = listenerQueues[type];
		let hasListeners = queue && queue.length;

		if (hasListeners) {
			for (let listener of queue.slice(0)) {
				listener.apply(null, Array.isArray(args) ? args : [args]);
			}
		}

		return hasListeners;
	};

	const reportModuleLoadError = function (parent: DojoLoader.Module | undefined, module: DojoLoader.Module, url: string, details?: string): void {
		const parentMid = (parent ? ` (parent: ${parent.mid})` : '');
		const message = `Failed to load module ${module.mid} from ${url}${parentMid}`;
		const error = mix<DojoLoader.LoaderError>(new Error(message), {
			src: 'dojo/loader',
			info: {
				module,
				url,
				parentMid,
				details
			}
		});

		if (!emit('error', error)) { throw error; };
	};

	const on = function(type: string, listener: (error: DojoLoader.LoaderError) => void): { remove: () => void } {
		let queue = listenerQueues[type] || (listenerQueues[type] = []);

		queue.push(listener);

		return {
			remove(): void {
				queue.splice(queue.indexOf(listener), 1);
			}
		};
	};

	requireModule.has = has;
	requireModule.on = on;

	has.add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
	has.add('host-node', typeof process === 'object' && process.versions && process.versions.node);
	has.add('host-nashorn', typeof load === 'function' && typeof Packages !== 'undefined');
	has.add('host-web-worker', !has('host-browser') && typeof importScripts !== 'undefined');
	has.add('debug', true);

	has.add('loader-configurable', true);
	has.add('loader-config-attribute', true);
	if (has('loader-configurable')) {
		/**
		 * Configures the loader.
		 *
		 * @param {{ ?baseUrl: string, ?map: Object, ?packages: Array.<({ name, ?location, ?main }|string)> }} config
		 * The configuration data.
		 */
		requireModule.config = function (configuration: DojoLoader.Config): void {
			// Make sure baseUrl ends in a slash
			if (configuration.baseUrl) {
				configuration.baseUrl = configuration.baseUrl.replace(/\/*$/, '/');
			}

			const mergeProps: DojoLoader.ObjectMap = {
				paths: true,
				bundles: true,
				config: true,
				map: true
			};

			// Copy configuration over to config object
			for (let key in configuration) {
				const value = (<DojoLoader.ObjectMap> configuration)[key];
				if (mergeProps[key]) {
					if (!(<DojoLoader.ObjectMap> config)[key]) {
						(<DojoLoader.ObjectMap> config)[key] = {};
					}
					mix((<DojoLoader.ObjectMap> config)[key], value, true);
				} else {
					(<DojoLoader.ObjectMap> config)[key] = value;
				}
			}

			// TODO: Expose all properties on req as getter/setters? Plugin modules like dojo/node being able to
			// retrieve baseUrl is important. baseUrl is defined as a getter currently.

			forEach(configuration.packages || [], function (packageDescriptor: DojoLoader.Package): void {
				// Allow shorthand package definition, where name and location are the same
				if (typeof packageDescriptor === 'string') {
					packageDescriptor = { name: <string> packageDescriptor, location: <string> packageDescriptor };
				}

				if (packageDescriptor.location != null) {
					packageDescriptor.location = packageDescriptor.location.replace(/\/*$/, '/');
				}

				if (config && config.pkgs && packageDescriptor.name) {
					config.pkgs[packageDescriptor.name] = packageDescriptor;
				}
			});

			function computeMapProgram(map: DojoLoader.ModuleMapItem | undefined): DojoLoader.MapItem[] {
				// This method takes a map as represented by a JavaScript object and initializes an array of
				// arrays of (map-key, map-value, regex-for-map-key, length-of-map-key), sorted decreasing by length-
				// of-map-key. The regex looks for the map-key followed by either "/" or end-of-string at the beginning
				// of a the search source.
				//
				// Maps look like this:
				//
				// map: { C: { D: E } }
				//    A	B
				//
				// The computed mapping is a 4-array deep tree, where the outermost array corresponds to the source
				// mapping object A, the 2nd level arrays each correspond to one of the source mappings C -> B, the 3rd
				// level arrays correspond to each destination mapping object B, and the innermost arrays each
				// correspond to one of the destination mappings D -> E.
				//
				// So, the overall structure looks like this:
				//
				// mapPrograms = [ source mapping array, source mapping array, ... ]
				// source mapping array = [
				//     source module id,
				//     [ destination mapping array, destination mapping array, ... ],
				//     RegExp that matches on source module id,
				//     source module id length
				// ]
				// destination mapping array = [
				//     original module id,
				//     destination module id,
				//     RegExp that matches on original module id,
				//     original module id length
				// ]

				const result: DojoLoader.MapItem[] = [];

				if (map) {
					for (let moduleId in map) {
						const value: any = (<any> map)[moduleId];
						const isValueAMapReplacement: boolean = typeof value === 'object';

						const item = <DojoLoader.MapItem> {
							0: moduleId,
							1: isValueAMapReplacement ? computeMapProgram(value) : value,
							2: new RegExp('^' + moduleId.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&') + '(?:\/|$)'),
							3: moduleId.length
						};
						result.push(item);

						if (isValueAMapReplacement && moduleId === '*') {
							(<DojoLoader.MapRoot> result).star = item[1];
						}
					}
				}

				result.sort(function (left: DojoLoader.MapItem, right: DojoLoader.MapItem): number {
					return right[3] - left[3];
				});

				return result;
			}

			// FIXME this is a down-cast.
			// computeMapProgram => MapItem[] => mapPrograms: MapSource[]
			// MapSource[1] => MapReplacement[] is more specific than MapItems[1] => any
			mapPrograms = computeMapProgram(config.map);

			// Note that old paths will get destroyed if reconfigured
			configuration.paths && (pathMapPrograms = computeMapProgram(configuration.paths));

			// shim API
			if (config.shim) {
				Object.keys(config.shim).forEach((moduleId) => {
					// guards currently get reset in callbacks: https://github.com/Microsoft/TypeScript/issues/11498
					const value = config.shim![moduleId];
					let moduleDef: ModuleShim;

					// using shorthand module syntax, convert to full syntax
					if (Array.isArray(value)) {
						moduleDef = {
							deps: value
						};
					}
					else {
						moduleDef = value;
					}

					define(moduleId, moduleDef.deps || [], function (...dependencies) {
						let root: any;

						let globalPath = moduleDef.exports;

						if (globalPath) {
							root = globalObject;

							globalPath.split('.').forEach((pathComponent) => {
								if (!(pathComponent in root)) {
									throw new Error(`Tried to find ${globalPath} but it did not exist`);
								} else {
									root = root[ pathComponent ];
								}
							});
						}

						if (moduleDef.init) {
							let newReturnValue: any = moduleDef.init(...dependencies);

							if (newReturnValue !== undefined) {
								root = newReturnValue;
							}
						}

						return root;
					});
				});
			}
		};

		if (has('loader-config-attribute') && has('host-browser')) {
			Array.prototype.slice.call(document.getElementsByTagName('script'), 0).forEach((script: HTMLScriptElement) => {
				if (script.hasAttribute('data-loader-config')) {
					const attr = script.getAttribute('data-loader-config');
					let dojoConfig: DojoLoader.Config | null = null;

					try {
						dojoConfig = <DojoLoader.Config> JSON.parse(`{ ${attr} }`);
					}
					catch (e) {
						console.error('Unable to parse data-loader-config, ' + attr);
						console.error(e);
					}

					if (dojoConfig !== null) {
						requireModule.config(dojoConfig);
					}
				}
			});
		}
	}

	function forEach<T>(array: T[], callback: (value: T, index: number, array: T[]) => void): void {
		array && array.forEach(callback);
	}

	function mix<T extends {}>(target: {}, source: {}, deep?: boolean): T {
		if (source) {
			for (let key in source) {
				let sourceValue = (<DojoLoader.ObjectMap> source)[key];

				if (deep && typeof sourceValue === 'object' &&
					!Array.isArray(sourceValue) && !(sourceValue instanceof RegExp)) {

					if (!(<DojoLoader.ObjectMap> target)[key]) {
						(<DojoLoader.ObjectMap> target)[key] = {};
					}
					mix((<DojoLoader.ObjectMap> target)[key], sourceValue, true);
				} else {
					(<DojoLoader.ObjectMap> target)[key] = sourceValue;
				}
			}
		}
		return <T> target;
	}

	function noop(): void {};

	let loadNodeModule: (moduleId: string, parent?: DojoLoader.Module) => any = noop;

	function contextRequire(moduleId: string, unused?: void, referenceModule?: DojoLoader.Module): DojoLoader.Module;
	function contextRequire(dependencies: string[], callback?: DojoLoader.RequireCallback, referenceModule?: DojoLoader.Module): DojoLoader.Module;
	function contextRequire(dependencies: string | string[], callback: any, referenceModule?: DojoLoader.Module): DojoLoader.Module | undefined {
		let module: DojoLoader.Module | undefined = undefined;
		if (typeof dependencies === 'string') {
			module = getModule(dependencies, referenceModule);
			if (module.executed !== true && module.executed !== EXECUTING) {
				if (has('host-node') && !module.plugin) {
					try {
						let result = loadNodeModule(module.mid, referenceModule);

						initializeModule(module, [], undefined);
						module.result = result;
						module.cjs.setExports(result);
						module.executed = true;
						module.injected = true;
					}
					catch (error) {
						throw new Error('Attempt to require unloaded module ' + module.mid);
					}
				}
				else if (module.plugin) {
					injectModule(module, undefined);
				}
			}
			// Assign the result of the module to `module`
			// otherwise require('moduleId') returns the internal
			// module representation
			module = module.result;
		}
		else if (Array.isArray(dependencies)) {
			// signature is (requestList [,callback])
			// construct a synthetic module to control execution of the requestList, and, optionally, callback
			module = getModuleInformation('*' + (++uidGenerator));
			mix(module, {
				deps: resolveDependencies(dependencies, module, referenceModule),
				def: callback || {},
				gc: true // garbage collect
			});
			guardCheckComplete(function (): void {
				forEach(module ? module.deps : [], injectModule.bind(null, module));
			});
			executionQueue.push(module);
			checkComplete();
		}
		return module;
	}

	function createRequire(module: DojoLoader.Module | undefined): DojoLoader.Require | undefined {
		let result: DojoLoader.Require | undefined = (!module && requireModule) || (module && module.require);
		if (!result && module) {
			module.require = result = <DojoLoader.Require> function (dependencies: any, callback: any): DojoLoader.Module {
				return contextRequire(dependencies, callback, module);
			};
			mix(mix(result, requireModule), {
				toUrl: function (name: string): string {
					return toUrl(name, module);
				},
				toAbsMid: function (mid: string): string {
					return toAbsMid(mid, module);
				}
			});
		}
		return result;
	}

	function runMapProgram(targetModuleId: string, map?: DojoLoader.MapItem[]): DojoLoader.MapSource | undefined {
		// search for targetModuleId in map; return the map item if found; falsy otherwise
		if (map) {
			for (let i = 0, j = map.length; i < j; ++i) {
				if (map[i][2].test(targetModuleId)) {
					return map[i];
				}
			}
		}

		return undefined;
	}

	function compactPath(path: string): string {
		const pathSegments: string[] = path.replace(/\\/g, '/').split('/');
		let absolutePathSegments: (string|undefined)[] = [];
		let segment: string | undefined;
		let lastSegment: string | undefined = '';

		while (pathSegments.length) {
			segment = pathSegments.shift();
			if (segment === '..' && absolutePathSegments.length && lastSegment !== '..') {
				absolutePathSegments.pop();
				lastSegment = absolutePathSegments[absolutePathSegments.length - 1];
			}
			else if (segment !== '.') {
				absolutePathSegments.push((lastSegment = segment));
			} // else ignore "."
		}

		return absolutePathSegments.join('/');
	}

	function updateModuleIdFromMap(moduleId: string, referenceModule?: DojoLoader.Module): string {
		// relative module ids are relative to the referenceModule; get rid of any dots
		moduleId = compactPath(/^\./.test(moduleId) && referenceModule ?
			(referenceModule.mid + '/../' + moduleId) : moduleId);
		// at this point, moduleId is an absolute moduleId

		// if there is a reference module, then use its module map, if one exists; otherwise, use the global map.
		// see computeMapProg for more information on the structure of the map arrays
		let moduleMap: DojoLoader.MapItem | undefined = referenceModule && runMapProgram(referenceModule.mid, mapPrograms);
		moduleMap = moduleMap ? moduleMap[1] : mapPrograms.star;

		let mapItem: DojoLoader.MapItem | undefined;
		if ((mapItem = runMapProgram(moduleId, moduleMap))) {
			moduleId = mapItem[1] + moduleId.slice(mapItem[3]);
		}

		return moduleId;
	}

	function getPluginInformation(moduleId: string, match: string[], referenceModule?: DojoLoader.Module): DojoLoader.Module {
		const plugin = getModule(match[1], referenceModule);
		const isPluginLoaded = Boolean(plugin.load);

		const contextRequire = createRequire(referenceModule);

		let pluginResourceId: string;
		if (isPluginLoaded) {
			pluginResourceId = resolvePluginResourceId(plugin, match[2], contextRequire);
			moduleId = (plugin.mid + '!' + pluginResourceId);
		}
		else {
			// if not loaded, need to mark in a way that it will get properly resolved later
			pluginResourceId = match[2];
			moduleId = plugin.mid + '!' + (++uidGenerator) + '!*';
		}
		return <DojoLoader.Module> <any> {
			plugin: plugin,
			mid: moduleId,
			req: contextRequire,
			prid: pluginResourceId,
			fix: !isPluginLoaded
		};
	}

	function getModuleInformation(moduleId: string, referenceModule?: DojoLoader.Module): DojoLoader.Module {
		let packageId = '';
		let pack: Package = {};
		let moduleIdInPackage = '';

		const matches = Object.keys((config && config.pkgs || {})).filter(pkg => (moduleId + '/').indexOf(pkg + '/') === 0).sort((a, b) => a.length > b.length ? -1 : 1);

		if (matches.length) {
			packageId = matches.shift() as string;
			pack = config.pkgs![packageId];
			moduleId = packageId + '/' + (moduleIdInPackage = (moduleId.substr(packageId.length + 1) || pack.main || 'main'));
		}

		let module = modules[moduleId];
		if (!(module)) {
			let mapItem = runMapProgram(moduleId, pathMapPrograms);
			let url = mapItem ? mapItem[1] + moduleId.slice(mapItem[3]) : (packageId ? pack.location + moduleIdInPackage : moduleId);
			module = <DojoLoader.Module> <any> {
				pid: packageId,
				mid: moduleId,
				pack: pack,
				url: compactPath(
					// absolute urls should not be prefixed with baseUrl
					(/^(?:\/|\w+:)/.test(url) ? '' : config.baseUrl) +
					url +
					// urls with a javascript extension should not have another one added
					(/\.js(?:\?[^?]*)?$/.test(url) ? '' : '.js')
				)
			};
		}

		return module;
	}

	function resolvePluginResourceId(plugin: DojoLoader.Module, pluginResourceId: string, contextRequire?: DojoLoader.Require): string {
		const toAbsMid = contextRequire ? contextRequire.toAbsMid : undefined;
		return plugin.normalize ? plugin.normalize(pluginResourceId, <any> toAbsMid) : toAbsMid ? toAbsMid(pluginResourceId) : '';
	}

	function getModule(moduleId: string, referenceModule?: DojoLoader.Module): DojoLoader.Module {
		// compute and construct (if necessary) the module implied by the moduleId with respect to referenceModule
		let module: DojoLoader.Module;
		const pluginRegEx = /^(.+?)\!(.*)$/;

		// Foreseable situations (where ?-> is a map lookup function)
		// module
		// plugin!arg
		// module ?-> mappedModule
		// module ?-> mappedPlugin!arg
		// plugin!arg ?-> mappedPlugin + ! + arg

		// Do inital check on the passed in moduleId
		const passedModuleMatch = moduleId.match(pluginRegEx);
		if (passedModuleMatch) {
			// Passed in moduleId is a plugin, so check the map using only the plugin name
			// then reconstruct using the pluginArgs
			let pluginId: string = updateModuleIdFromMap(passedModuleMatch[1], referenceModule);
			moduleId = `${pluginId}!${passedModuleMatch[2]}`;
		}
		else {
			// Not a module, so check the map using the full moduleId passed
			moduleId = updateModuleIdFromMap(moduleId, referenceModule);
		}

		// Do final check on the mapped module / plugin Id to see what we're dealing with
		const mappedModuleMatch = moduleId.match(pluginRegEx);
		if (mappedModuleMatch) {
			module = getPluginInformation(moduleId, mappedModuleMatch, referenceModule);
		}
		else {
			module = getModuleInformation(moduleId, referenceModule);
		}

		return modules[module.mid] || (modules[module.mid] = module);
	}

	function toAbsMid(moduleId: string, referenceModule: DojoLoader.Module | undefined): string {
		moduleId = updateModuleIdFromMap(moduleId, referenceModule);
		return getModuleInformation(moduleId, referenceModule).mid;
	}

	function toUrl(name: string, referenceModule: DojoLoader.Module | undefined): string {
		let moduleId = name + '/x';
		moduleId = updateModuleIdFromMap(moduleId, referenceModule);
		const moduleInfo: DojoLoader.Module = getModuleInformation(moduleId, referenceModule);
		const url: string = moduleInfo.url;

		// "/x.js" since getModuleInfo automatically appends ".js" and we appended "/x" to make name look like a
		// module id
		return url.slice(0, url.length - 5);
	}

	function makeCommonJs(mid: string): DojoLoader.Module {
		return (modules[mid] = <DojoLoader.Module> <any> {
			mid: mid,
			injected: true,
			executed: true
		});
	}
	const commonJsRequireModule: DojoLoader.Module = makeCommonJs('require');
	const commonJsExportsModule: DojoLoader.Module = makeCommonJs('exports');
	const commonJsModuleModule: DojoLoader.Module = makeCommonJs('module');
	let circularTrace: string[];

	has.add('loader-debug-circular-dependencies', true);
	if (has('loader-debug-circular-dependencies')) {
		circularTrace = [];
	}

	function executeModule(module: DojoLoader.Module): any {
		// run the dependency array, then run the factory for module
		if (module.executed === EXECUTING) {
			// for circular dependencies, assume the first module encountered was executed OK
			// modules that circularly depend on a module that has not run its factory will get
			// the premade cjs.exports===module.result. They can take a reference to this object and/or
			// add properties to it. When the module finally runs its factory, the factory can
			// read/write/replace this object. Notice that so long as the object isn't replaced, any
			// reference taken earlier while walking the dependencies list is still valid.
			if (
				has('loader-debug-circular-dependencies') &&
				module.deps.indexOf(commonJsExportsModule) === -1 &&
				typeof console !== 'undefined'
			) {
				console.warn('Circular dependency: ' + circularTrace.concat(module.mid).join(' -> '));
			}

			return module.result;
		}

		if (!module.executed) {
			// TODO: This seems like an incorrect condition inference. Originally it was simply !module.def
			// which caused modules with falsy defined values to never execute.
			if (!module.def && !module.deps) {
				return ABORT_EXECUTION;
			}

			has('loader-debug-circular-dependencies') && circularTrace.push(module.mid);

			const dependencies: DojoLoader.Module[] = module.deps;
			let result: any;

			module.executed = EXECUTING;
			let executedDependencies = dependencies.map(function (dependency: DojoLoader.Module): any {
				if (result !== ABORT_EXECUTION) {
					// check for keyword dependencies: DojoLoader.require, exports, module; then execute module dependency
					result = ((dependency === commonJsRequireModule) ? createRequire(module) :
								((dependency === commonJsExportsModule) ? module.cjs.exports :
									((dependency === commonJsModuleModule) ? module.cjs :
										executeModule(dependency))));
				}
				return result;
			});

			if (result === ABORT_EXECUTION) {
				module.executed = false;
				has('loader-debug-circular-dependencies') && circularTrace.pop();
				return ABORT_EXECUTION;
			}

			const factory: DojoLoader.Factory = module.def;
			result = typeof factory === 'function' ? factory.apply(null, executedDependencies) : factory;

			// TODO: But of course, module.cjs always exists.
			// Assign the new module.result to result so plugins can use exports
			// to define their interface; the plugin checks below use result
			result = module.result = result === undefined && module.cjs ? module.cjs.exports : result;
			module.executed = true;
			executedSomething = true;

			// delete references to synthetic modules
			if (module.gc) {
				modules[module.mid] = undefined;
			}

			// if result defines load, just assume it's a plugin; harmless if the assumption is wrong
			result && result.load && [ 'normalize', 'load' ].forEach(function (key: string): void {
				(<any> module)[key] = (<any> result)[key];
			});

			// for plugins, resolve the loadQ
			forEach(module.loadQ || [], function (pseudoPluginResource: DojoLoader.Module): void {
				// manufacture and insert the real module in modules
				const pluginResourceId: string = resolvePluginResourceId(module, pseudoPluginResource.prid,
					pseudoPluginResource.req);
				const moduleId: string = (module.mid + '!' + pluginResourceId);
				const pluginResource: DojoLoader.Module =
					<DojoLoader.Module> mix(mix({}, pseudoPluginResource), { mid: moduleId, prid: pluginResourceId });

				if (!modules[moduleId]) {
					// create a new (the real) plugin resource and inject it normally now that the plugin is on board
					injectPlugin((modules[moduleId] = pluginResource));
				} // else this was a duplicate request for the same (plugin, rid)

				// pluginResource is really just a placeholder with the wrong moduleId (because we couldn't calculate it
				// until the plugin was on board) fix() replaces the pseudo module in a resolved dependencies array with the
				// real module lastly, mark the pseudo module as arrived and delete it from modules
				if (pseudoPluginResource && pseudoPluginResource.fix) {
					pseudoPluginResource.fix(<any> modules[moduleId]);
				}
				--waitingCount;
				modules[pseudoPluginResource.mid] = undefined;
			});
			module.loadQ = undefined;

			has('loader-debug-circular-dependencies') && circularTrace.pop();
		}

		// at this point the module is guaranteed fully executed
		return module.result;
	}

	// TODO: Figure out what proc actually is
	function guardCheckComplete(callback: Function): void {
		++checkCompleteGuard;
		callback();
		--checkCompleteGuard;
	}

	function checkComplete(): void {
		// keep going through the executionQueue as long as at least one factory is executed
		// plugins, recursion, cached modules all make for many execution path possibilities
		!checkCompleteGuard && guardCheckComplete(function (): void {
			for (let module: DojoLoader.Module, i = 0; i < executionQueue.length; ) {
				module = executionQueue[i];
				if (module.executed === true) {
					executionQueue.splice(i, 1);
				}
				else {
					executedSomething = false;
					executeModule(module);
					if (executedSomething) {
						// something was executed; this indicates the executionQueue was modified, maybe a
						// lot (for example a later module causes an earlier module to execute)
						i = 0;
					}
					else {
						// nothing happened; check the next module in the exec queue
						i++;
					}
				}
			}
		});
	}

	function injectPlugin(module: DojoLoader.Module): void {
		// injects the plugin module given by module; may have to inject the plugin itself
		const plugin: DojoLoader.Module | undefined = module.plugin;
		const onLoad = function (def: any): void {
				module.result = def;
				--waitingCount;
				module.executed = true;
				checkComplete();
			};

		if (plugin && plugin.load) {
			plugin.load(module.prid, module.req, onLoad, config);
		}
		else if (plugin && plugin.loadQ) {
			plugin.loadQ.push(module);
		}
		else if (plugin) {
			// the unshift instead of push is important: we don't want plugins to execute as
			// dependencies of some other module because this may cause circles when the plugin
			// loadQ is run; also, generally, we want plugins to run early since they may load
			// several other modules and therefore can potentially unblock many modules
			plugin.loadQ = [ module ];
			executionQueue.unshift(plugin);
			injectModule(module, plugin);
		}
	}

	function injectModule(parent?: DojoLoader.Module, module?: DojoLoader.Module): void {
		// TODO: This is for debugging, we should bracket it
		if (!module) {
			module = parent;
			parent = undefined;
		}

		if (module && module.plugin) {
			injectPlugin(module);
		}
		else if (module && !module.injected) {
			let cached: DojoLoader.Factory;
			const onLoadCallback = function (node?: HTMLScriptElement): void {
				let moduleDefArgs: string[] = [];
				let moduleDefFactory: DojoLoader.Factory | undefined = undefined;

				// non-amd module
				if (moduleDefinitionArguments) {
					moduleDefArgs = moduleDefinitionArguments[0];
					moduleDefFactory = moduleDefinitionArguments[1];
				}

				defineModule(module, moduleDefArgs, moduleDefFactory);
				moduleDefinitionArguments = undefined;

				guardCheckComplete(function (): void {
					forEach((module && module.deps) || [], injectModule.bind(null, module));
				});
				checkComplete();
			};

			++waitingCount;
			module.injected = true;
			if (cached = cache[module.mid]) {
				try {
					cached();
					onLoadCallback();
					return;
				}
				catch (error) {
					// If a cache load fails, retrieve using injectUrl
					// TODO: report error, 'cachedThrew', [ error, module ]
				}
			}
			injectUrl(module.url, onLoadCallback, module, parent);
		}
	}

	function resolveDependencies(dependencies: string[], module: DojoLoader.Module, referenceModule?: DojoLoader.Module): DojoLoader.Module[] {
		// resolve dependencies with respect to this module
		return dependencies.map(function (dependency: string, i: number): DojoLoader.Module {
			const result: DojoLoader.Module = getModule(dependency, referenceModule);
			if (result.fix) {
				result.fix = function (m: DojoLoader.Module): void {
					module.deps[i] = m;
				};
			}
			return result;
		});
	}

	function defineModule(module: DojoLoader.Module | undefined, dependencies: string[], factory?: DojoLoader.Factory): DojoLoader.Module | undefined {
		--waitingCount;
		return initializeModule(module, dependencies, factory);
	}

	function initializeModule(module: DojoLoader.Module | undefined, dependencies: string[], factory?: DojoLoader.Factory): DojoLoader.Module | undefined {
		const moduleToInitialize = module;
		let initializedModule: DojoLoader.Module | undefined = undefined;

		if (moduleToInitialize) {
			initializedModule = <DojoLoader.Module> mix(moduleToInitialize, {
				def: factory,
				deps: resolveDependencies(dependencies, moduleToInitialize, moduleToInitialize),
				cjs: {
					id: moduleToInitialize.mid,
					uri: moduleToInitialize.url,
					exports: (moduleToInitialize.result = {}),
					setExports: function (exports: any): void {
						moduleToInitialize.cjs.exports = exports;
					}
				}
			});
		}
		return initializedModule;
	}

	has.add('function-bind', Boolean(Function.prototype.bind));
	if (!has('function-bind')) {
		injectModule.bind = function (thisArg: any): typeof injectModule {
			const slice = Array.prototype.slice;
			const args: any[] = slice.call(arguments, 1);

			return function (): void {
				return injectModule.apply(thisArg, args.concat(slice.call(arguments, 0)));
			};
		};
	}

	let globalObjectGlobals = function (require: DojoLoader.Require, define: DojoLoader.Define): void {
		globalObject.require = require;
		globalObject.define = define;
	};

	if (has('host-node')) {
		loadNodeModule = (moduleId: string, parent?: DojoLoader.Module): any => {
			let module: any = require('module');
			let result: any;

			if (module._findPath && module._nodeModulePaths) {
				let localModulePath = module._findPath(moduleId, module._nodeModulePaths(toUrl('.', parent)));

				if (localModulePath !== false) {
					moduleId = localModulePath;
				}
			}

			// Some modules attempt to detect an AMD loader by looking for global AMD `define`. This causes issues
			// when other CommonJS modules attempt to load them via the standard Node.js `require`, so hide it
			// during the load
			globalObject.define = undefined;

			try {
				if (requireModule && requireModule.nodeRequire) {
					result = requireModule.nodeRequire(moduleId);
				}
			}
			catch (error) {
				throw error;
			}
			finally {
				globalObject.define = define;
			}

			return result;
		};

		const vm: any = require('vm');
		const fs: any = require('fs');

		// retain the ability to get node's require
		requireModule.nodeRequire = require;
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void,
							module: DojoLoader.Module, parent?: DojoLoader.Module): void {
			fs.readFile(url, 'utf8', function (error: Error, data: string): void {
				function loadCallback () {
					try {
						let result = loadNodeModule(module.mid, parent);
						return result;
					}
					catch (error) {
						reportModuleLoadError(parent, module, url, error.message);
					}
				}
				if (error) {
					moduleDefinitionArguments = [ [], loadCallback ];
				}
				else {
					// global `module` variable needs to be shadowed for UMD modules that are loaded in an Electron
					// webview; in Node.js the `module` variable does not exist when using `vm.runInThisContext`,
					// but in Electron it exists in the webview when Node.js integration is enabled which causes loaded
					// modules to register with Node.js and break the loader
					let oldModule = globalObject.module;
					globalObject.module = undefined;
					try {
						/**
						 * Using an `object` as a second argument causes Instabul
						 * issues and then thinks the file should not be instrumented
						 *
						 * See: dojo/loader#57
						 */
						vm.runInThisContext(data, url);
					}
					catch (error) {
						reportModuleLoadError(parent, module, url, error.message);
					}
					finally {
						globalObject.module = oldModule;
					}
				}

				callback();
			});
		};

		setGlobals = function (require: DojoLoader.RootRequire, define: DojoLoader.Define): void {
			module.exports = globalObject.require = require;
			globalObject.define = define;
		};
	}
	else if (has('host-browser')) {
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void, module: DojoLoader.Module,
							parent?: DojoLoader.Module): void {
			// insert a script element to the insert-point element with src=url;
			// apply callback upon detecting the script has loaded.
			const node: HTMLScriptElement = document.createElement('script');
			const handler: EventListener = function (event: Event): void {
				document.head.removeChild(node);

				if (event.type === 'load') {
					callback();
				}
				else {
					reportModuleLoadError(parent, module, url);
				}
			};

			node.addEventListener('load', handler, false);
			node.addEventListener('error', handler, false);

			if (config.crossOrigin !== false) {
				(<any> node).crossOrigin = config.crossOrigin;
			}

			node.charset = 'utf-8';
			node.src = url;
			document.head.appendChild(node);
		};

		setGlobals = globalObjectGlobals;
	}
	else if (has('host-nashorn')) {
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void, module: DojoLoader.Module,
			parent?: DojoLoader.Module): void {

			load(url);
			callback();
		};

		setGlobals = globalObjectGlobals;
	}
	else if (has('host-web-worker')) {
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void, module: DojoLoader.Module,
			parent?: DojoLoader.Module): void {

			try {
				importScripts(url);
			}
			catch (e) {
				reportModuleLoadError(parent, module, url);
			}
			callback();
		};

		setGlobals = globalObjectGlobals;
	}
	else {
		throw new Error('Unsupported platform');
	}

	has.add('loader-debug-internals', true);
	if (has('loader-debug-internals')) {
		requireModule.inspect = function (name: string): any {
			/* tslint:disable:no-eval */
			// TODO: Should this use console.log so people do not get any bright ideas about using this in apps?
			return eval(name);
			/* tslint:enable:no-eval */
		};
	}

	has.add('loader-undef', true);
	if (has('loader-undef')) {
		requireModule.undef = function (id: string, recursive?: boolean): void {
			const module: Module | undefined = modules[id];
			const undefDeps = function (mod: Module): void {
				if (mod === commonJsRequireModule || mod === commonJsModuleModule || mod === commonJsExportsModule) {
					return;
				}
				if (mod.deps) {
					forEach(mod.deps, undefDeps);
				}

				modules[mod.mid] = undefined;
			};
			if (module) {
				if (recursive && module.deps) {
					forEach(module.deps, undefDeps);
				}
				delete modules[module.mid];
				delete cache[module.mid];
			}
		};
	}

	mix(requireModule, {
		toAbsMid: toAbsMid,
		toUrl: toUrl,

		cache: function (cacheModules: DojoLoader.ObjectMap): void {
			let item: any;

			for (let key in cacheModules) {
				item = cacheModules[key];

				cache[
					getModuleInformation(key, undefined).mid
					] = item;
			}
		}
	});

	Object.defineProperty(requireModule, 'baseUrl', {
		get: function (): string | undefined {
			return config.baseUrl;
		},
		enumerable: true
	});

	has.add('loader-cjs-wrapping', true);

	let comments: RegExp;
	let requireCall: RegExp;

	if (has('loader-cjs-wrapping')) {
		comments = /\/\*[\s\S]*?\*\/|\/\/.*$/mg;
		requireCall = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)/g;
	}

	has.add('loader-explicit-mid', true);

	/**
	 * @param deps //(array of commonjs.moduleId, optional)
	 * @param factory //(any)
	 */
	let define: DojoLoader.Define = <DojoLoader.Define> mix(function (dependencies: string[], factory: DojoLoader.Factory): void {
		let originalFactory: any;
		if (has('loader-explicit-mid') && arguments.length > 1 && typeof dependencies === 'string') {
			let id: string = <any> dependencies;
			if (arguments.length === 3) {
				dependencies = <any> factory;
				factory = arguments[2];
			} else {
				dependencies = [];
			}

			// Some modules in the wild have an explicit module ID that is null; ignore the module ID in this case and
			// register normally using the request module ID
			if (id != null) {
				let module: DojoLoader.Module = getModule(id);
				if (factory) {
					originalFactory = factory;
					factory = function () {
						module.executed = true;
						return (module.result = originalFactory.apply ?
							originalFactory.apply(null, arguments) : originalFactory);
					};
				}
				module.injected = true;
				defineModule(module, dependencies, factory);
				guardCheckComplete(function (): void {
					forEach(module.deps, injectModule.bind(null, module));
				});
			}
		}

		if (arguments.length === 1) {
			if (has('loader-cjs-wrapping') && typeof dependencies === 'function') {
				originalFactory = <any> dependencies;
				dependencies = [ 'require', 'exports', 'module' ];

				// Scan factory for require() calls and add them to the
				// list of dependencies
				originalFactory.toString()
					.replace(comments, '')
					.replace(requireCall, function (): string {
						dependencies.push(/* mid */ arguments[2]);
						return arguments[0];
					});
				factory = function (require, exports, module): any {
					const originalModuleId = module.id;
					let result: any = originalFactory.apply(null, arguments);
					if (originalModuleId !== module.id) {
						const newModule: DojoLoader.Module = getModule(module.id);
						defineModule(newModule, dependencies, undefined);
						newModule.injected = true;
						newModule.executed = true;
						newModule.result = module.exports = result || module.exports;
					}
					return result;
				};
			}
			else if (/* define(value) */ !Array.isArray(dependencies)) {
				const value: any = dependencies;
				dependencies = [];
				factory = function (): any {
					return value;
				};
			}
		}

		moduleDefinitionArguments = [ dependencies, factory ];
	}, {
		amd: { vendor: 'dojotoolkit.org' }
	});

	setGlobals(requireModule, define);
	if (has('host-nashorn') && args && args[0]) {
		load(args[0]);
	}
})((typeof Packages !== 'undefined' ? Array.prototype.slice.call(arguments, 0) : []));
