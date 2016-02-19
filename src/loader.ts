// Create ambient declarations for global node.js variables.
declare var process: any;
declare var require: <ModuleType>(moduleId: string) => ModuleType;
declare var module: { exports: any; };

export interface Config {
	baseUrl?: string;
	map?: ModuleMap;
	packages?: Package[];
	paths?: { [ path: string ]: string; };
}

export interface Define {
	(moduleId: string, dependencies: string[], factory: Factory): void;
	(dependencies: string[], factory: Factory): void;
	(factory: Factory): void;
	(value: any): void;
}

export interface Factory {
	(...modules: any[]): any;
}

export interface Has {
	(name: string): any;
	add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any,
		now?: boolean, force?: boolean): void;
	add(name: string, value: any, now?: boolean, force?: boolean): void;
}

export interface LoaderPlugin {
	load?: (resourceId: string, require: Require, load: (value?: any) => void, config?: Object) => void;
	normalize?: (moduleId: string, normalize: (moduleId: string) => string) => string;
}

export interface MapItem extends Array<any> {
	/* prefix */      0: string;
	/* replacement */ 1: any;
	/* regExp */      2: RegExp;
	/* length */      3: number;
}

export interface MapReplacement extends MapItem {
	/* replacement */ 1: string;
}

export interface MapRoot extends Array<MapSource> {
	star?: MapSource;
}

export interface MapSource extends MapItem {
	/* replacement */ 1: MapReplacement[];
}

// TODO are we still abbreviating these properties?
export interface Module extends LoaderPlugin {
	cjs: {
		exports: any;
		id: string;
		setExports: (exports: any) => void;
		uri: string;
	};
	def: Factory;
	deps: Module[];
	executed: any; // TODO: enum
	injected: boolean;
	fix?: (module: Module) => void;
	gc: boolean;
	mid: string;
	pack: Package;
	req: Require;
	require?: Require; // TODO: WTF?
	result: any;
	url: string;

	// plugin interface
	loadQ?: Module[];
	plugin?: Module;
	prid: string;
}

export interface ModuleMap extends ModuleMapItem {
	[ sourceMid: string ]: ModuleMapReplacement;
}

export interface ModuleMapItem {
	[ mid: string ]: /* ModuleMapReplacement | ModuleMap */ any;
}

export interface ModuleMapReplacement extends ModuleMapItem {
	[ findMid: string ]: /* replaceMid */ string;
}

export interface Package {
	location?: string;
	main?: string;
	name?: string;
}

export interface PackageMap {
	[ packageId: string ]: Package;
}

export interface PathMap extends MapReplacement {}

export interface Require {
	(config: Config, dependencies?: string[], callback?: RequireCallback): void;
	(dependencies: string[], callback: RequireCallback): void;
	<ModuleType>(moduleId: string): ModuleType;

	toAbsMid(moduleId: string): string;
	toUrl(path: string): string;
}

export interface RequireCallback {
	(...modules: any[]): void;
}

export interface RootRequire extends Require {
	has: Has;
	on(type: string, listener: any): { remove: () => void };
	config(config: Config): void;
	inspect?(name: string): any;
	nodeRequire?(id: string): any;
	undef(moduleId: string): void;
}

interface ObjectMap { [ key: string ]: any; }

interface ModuleDefinitionArguments extends Array<any> {
	0: string[];
	1: Factory;
}

interface ListenerQueueMap {
	[type: string]: any[];
}

(function (): void {
	const EXECUTING: string = 'executing';
	const ABORT_EXECUTION: Object = {};

	//
	// loader state data
	//
	// AMD baseUrl config
	let baseUrl: string = './';

	// hash: (mid | url)-->(function | string)
	//
	// A cache of resources. The resources arrive via a require.cache application, which takes a hash from either
	// mid --> function or url --> string. The function associated with mid keys causes the same code to execute as if
	// the module was script injected.
	//
	// Both kinds of key-value pairs are entered into cache via the function consumePendingCache, which may relocate
	// keys as given by any mappings *iff* the cache was received as part of a module resource request.
	let cache: ObjectMap = {};

	let checkCompleteGuard: number = 0;

	// The arguments sent to loader via AMD define().
	let moduleDefinitionArguments: ModuleDefinitionArguments = null;

	// The list of modules that need to be evaluated.
	let executionQueue: Module[] = [];

	let executedSomething: boolean = false;

	let injectUrl: (url: string, callback: (node?: HTMLScriptElement) => void, module: Module, parent?: Module) => void;

	// AMD map config variable
	let map: ModuleMap = {};

	// array of quads as described by computeMapProg; map-key is AMD map key, map-value is AMD map value
	let mapPrograms: MapRoot = [];

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
	let modules: { [ moduleId: string ]: Module; } = {};

	// a map from pid to package configuration object
	let packageMap: PackageMap = {};

	// list of (from-path, to-path, regex, length) derived from paths;
	// a "program" to apply paths; see computeMapProg
	let pathMapPrograms: PathMap[] = [];

	// hash: (mid | url)-->(function | string)
	//
	// Gives a set of cache modules pending entry into cache. When cached modules are published to the loader, they are
	// entered into pendingCacheInsert; modules are then pressed into cache upon (1) AMD define or (2) upon receiving
	// another independent set of cached modules. (1) is the usual case, and this case allows normalizing mids given
	// in the pending cache for the local configuration, possibly relocating modules.
	let pendingCacheInsert: { [moduleId: string]: any; } = {};

	let setGlobals: (require: Require, define: Define) => void;

	let uidGenerator: number = 0;

	// the number of modules the loader has injected but has not seen defined
	let waitingCount: number = 0;

	const has: Has = (function (): Has {
		const hasCache: { [ name: string ]: any; } = Object.create(null);
		const global: Window = this;
		const document: HTMLDocument = global.document;
		const element: HTMLDivElement = document && document.createElement('div');

		const has: Has = <Has> function(name: string): any {
			return typeof hasCache[name] === 'function' ?
				(hasCache[name] = hasCache[name](global, document, element)) : hasCache[name];
		};

		has.add = function (name: string, test: any, now: boolean, force: boolean): void {
			(!(name in hasCache) || force) && (hasCache[name] = test);
			now && has(name);
		};

		return has;
	})();

	let listenerQueues: ListenerQueueMap = {};

	const makeSignalError = function (type: string, args: ObjectMap): Object {
		return mix(new Error(type), {
			src: 'dojo/loader',
			info: args
		});
	};

	const signals = {
		error: 'error'
	};

	const signal = function(type: string, args: Object) {
		let queue: any[] = listenerQueues[type];

		for (let listener of queue.slice(0)) {
			listener.apply(null, Array.isArray(args) ? args : [args]);
		}
	};

	const on = function(type: string, listener: () => any): { remove: () => void } {
		let queue = listenerQueues[type] || (listenerQueues[type] = []);

		queue.push(listener);

		return {
			remove: function() : void {
				for (let i = 0; i < queue.length; i++) {
					if (queue[i] === listener) {
						queue.splice(i, 1);
						return;
					}
				}
			}
		};
	};

	const requireModule: RootRequire =
		<RootRequire> function (configuration: any, dependencies?: any, callback?: RequireCallback): Module {
		if (Array.isArray(configuration) || /* require(mid) */ typeof configuration === 'string') {
			callback = <RequireCallback> dependencies;
			dependencies = <string[]> configuration;
			configuration = {};
		}

		has('loader-configurable') && configure(configuration);

		return contextRequire(dependencies, callback);
	};
	requireModule.has = has;
	requireModule.on = on;

	has.add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
	has.add('host-node', typeof process === 'object' && process.versions && process.versions.node);
	has.add('debug', true);

	// IE9 will process multiple scripts at once before firing their respective onload events, so some extra work
	// needs to be done to associate the content of the define call with the correct node. This is known to be fixed
	// in IE10 and the bad behaviour cannot be inferred through feature detection, so simply target this one user-agent
	has.add('loader-ie9-compat', has('host-browser') && navigator.userAgent.indexOf('MSIE 9.0') > -1);

	has.add('loader-configurable', true);
	if (has('loader-configurable')) {
		/**
		 * Configures the loader.
		 *
		 * @param {{ ?baseUrl: string, ?map: Object, ?packages: Array.<({ name, ?location, ?main }|string)> }} config
		 * The configuration data.
		 */
		var configure: (configuration: Config) => void = requireModule.config = function (configuration: Config): void {
			// TODO: Expose all properties on req as getter/setters? Plugin modules like dojo/node being able to
			// retrieve baseUrl is important. baseUrl is defined as a getter currently.
			baseUrl = (configuration.baseUrl || baseUrl).replace(/\/*$/, '/');

			forEach(configuration.packages, function (packageDescriptor: Package): void {
				// Allow shorthand package definition, where name and location are the same
				if (typeof packageDescriptor === 'string') {
					packageDescriptor = { name: <string> packageDescriptor, location: <string> packageDescriptor };
				}

				if (packageDescriptor.location != null) {
					packageDescriptor.location = packageDescriptor.location.replace(/\/*$/, '/');
				}

				packageMap[packageDescriptor.name] = packageDescriptor;
			});

			function computeMapProgram(map: ModuleMapItem): MapItem[] {
				// This method takes a map as represented by a JavaScript object and initializes an array of
				// arrays of (map-key, map-value, regex-for-map-key, length-of-map-key), sorted decreasing by length-
				// of-map-key. The regex looks for the map-key followed by either "/" or end-of-string at the beginning
				// of a the search source.
				//
				// Maps look like this:
				//
				// map: { C: { D: E } }
				//      A    B
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

				const result: MapItem[] = [];

				for (let moduleId in map) {
					const value: any = (<any> map)[moduleId];
					const isValueAMapReplacement: boolean = typeof value === 'object';

					const item = <MapItem> {
						0: moduleId,
						1: isValueAMapReplacement ? computeMapProgram(value) : value,
						2: new RegExp('^' + moduleId.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&') + '(?:\/|$)'),
						3: moduleId.length
					};
					result.push(item);

					if (isValueAMapReplacement && moduleId === '*') {
						(<MapRoot> result).star = item[1];
					}
				}

				result.sort(function (left: MapItem, right: MapItem): number {
					return right[3] - left[3];
				});

				return result;
			}

			mix(map, configuration.map);

			// FIXME this is a down-cast.
			// computeMapProgram => MapItem[] => mapPrograms: MapSource[]
			// MapSource[1] => MapReplacement[] is more specific than MapItems[1] => any
			mapPrograms = computeMapProgram(map);

			// Note that old paths will get destroyed if reconfigured
			configuration.paths && (pathMapPrograms = computeMapProgram(configuration.paths));
		};
	}

	function forEach<T>(array: T[], callback: (value: T, index: number, array: T[]) => void): void {
		array && array.forEach(callback);
	}

	function mix(target: {}, source: {}): {} {
		for (let key in source) {
			(<ObjectMap> target)[key] = (<ObjectMap> source)[key];
		}
		return target;
	}

	function consumePendingCacheInsert(referenceModule?: Module): void {
		let item: any;

		for (let key in pendingCacheInsert) {
			item = pendingCacheInsert[key];

			cache[
				typeof item === 'string' ? toUrl(key, referenceModule) : getModuleInformation(key, referenceModule).mid
			] = item;
		}

		pendingCacheInsert = {};
	}

	function contextRequire(moduleId: string, unused?: void, referenceModule?: Module): Module;
	function contextRequire(dependencies: string[], callback: RequireCallback, referenceModule?: Module): Module;
	function contextRequire(dependencies: string | string[], callback: any, referenceModule?: Module): Module {
		let module: Module;
		if (typeof dependencies === 'string') {
			module = getModule(dependencies, referenceModule);
			if (module.executed !== true && module.executed !== EXECUTING) {
				if (has('host-node') && !module.plugin) {
					let result = loadNodeModule(module.mid, referenceModule);
					if (result) {
						initializeModule(module, [], null);
						module.result = result;
						module.cjs.setExports(result);
						module.executed = true;
						module.injected = true;
					} else {
						throw new Error('Attempt to require unloaded module ' + module.mid);
					}
				}
				else if (module.plugin) {
					injectModule(module, null);
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
				forEach(module.deps, injectModule.bind(null, module));
			});
			executionQueue.push(module);
			checkComplete();
		}
		return module;
	}

	function createRequire(module: Module): Require {
		let result: Require = (!module && requireModule) || module.require;
		if (!result) {
			module.require = result = <Require> function (dependencies: any, callback: any): Module {
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

	function runMapProgram(targetModuleId: string, map: MapItem[]): MapSource {
		// search for targetModuleId in map; return the map item if found; falsy otherwise
		if (map) {
			for (let i = 0, j = map.length; i < j; ++i) {
				if (map[i][2].test(targetModuleId)) {
					return map[i];
				}
			}
		}

		return null;
	}

	function compactPath(path: string): string {
		const pathSegments: string[] = path.replace(/\\/g, '/').split('/');
		let absolutePathSegments: string[] = [];
		let segment: string;
		let lastSegment: string;

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

	function getModuleInformation(moduleId: string, referenceModule?: Module): Module {
		// relative module ids are relative to the referenceModule; get rid of any dots
		moduleId = compactPath(/^\./.test(moduleId) && referenceModule ?
			(referenceModule.mid + '/../' + moduleId) : moduleId);
		// at this point, moduleId is an absolute moduleId

		// if there is a reference module, then use its module map, if one exists; otherwise, use the global map.
		// see computeMapProg for more information on the structure of the map arrays
		let moduleMap: MapItem = referenceModule && runMapProgram(referenceModule.mid, mapPrograms);
		moduleMap = moduleMap ? moduleMap[1] : mapPrograms.star;

		let mapItem: MapItem;
		if ((mapItem = runMapProgram(moduleId, moduleMap))) {
			moduleId = mapItem[1] + moduleId.slice(mapItem[3]);
		}

		let match = moduleId.match(/^([^\/]+)(\/(.+))?$/);
		let packageId = match ? match[1] : '';
		let pack = packageMap[packageId];
		let moduleIdInPackage: string;

		if (pack) {
			moduleId = packageId + '/' + (moduleIdInPackage = (match[3] || pack.main || 'main'));
		}
		else {
			packageId = '';
		}

		let module = modules[moduleId];
		if (!(module)) {
			mapItem = runMapProgram(moduleId, pathMapPrograms);
			let url = mapItem ? mapItem[1] + moduleId.slice(mapItem[3]) : (packageId ? pack.location + moduleIdInPackage : moduleId);
			module = <Module> <any> {
				pid: packageId,
				mid: moduleId,
				pack: pack,
				url: compactPath(
					// absolute urls should not be prefixed with baseUrl
					(/^(?:\/|\w+:)/.test(url) ? '' : baseUrl) +
					url +
					// urls with a javascript extension should not have another one added
					(/\.js(?:\?[^?]*)?$/.test(url) ? '' : '.js')
				)
			};
		}

		return module;
	}

	function resolvePluginResourceId(plugin: Module, pluginResourceId: string, contextRequire: Require): string {
		return plugin.normalize ? plugin.normalize(pluginResourceId, contextRequire.toAbsMid) :
			contextRequire.toAbsMid(pluginResourceId);
	}

	function getModule(moduleId: string, referenceModule?: Module): Module {
		// compute and construct (if necessary) the module implied by the moduleId with respect to referenceModule
		let module: Module;

		const match = moduleId.match(/^(.+?)\!(.*)$/);
		if (match) {
			// name was <plugin-module>!<plugin-resource-id>
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
			module = <Module> <any> {
				plugin: plugin,
				mid: moduleId,
				req: contextRequire,
				prid: pluginResourceId,
				fix: !isPluginLoaded
			};
		}
		else {
			module = getModuleInformation(moduleId, referenceModule);
		}
		return modules[module.mid] || (modules[module.mid] = module);
	}

	function toAbsMid(moduleId: string, referenceModule: Module): string {
		return getModuleInformation(moduleId, referenceModule).mid;
	}

	function toUrl(name: string, referenceModule: Module): string {
		const moduleInfo: Module = getModuleInformation(name + '/x', referenceModule);
		const url: string = moduleInfo.url;

		// "/x.js" since getModuleInfo automatically appends ".js" and we appended "/x" to make name look like a
		// module id
		return url.slice(0, url.length - 5);
	}

	function makeCommonJs(mid: string): Module {
		return (modules[mid] = <Module> <any> {
			mid: mid,
			injected: true,
			executed: true
		});
	}
	const commonJsRequireModule: Module = makeCommonJs('require');
	const commonJsExportsModule: Module = makeCommonJs('exports');
	const commonJsModuleModule: Module = makeCommonJs('module');

	has.add('loader-debug-circular-dependencies', true);
	if (has('loader-debug-circular-dependencies')) {
		var circularTrace: string[] = [];
	}

	function executeModule(module: Module): any {
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

			const dependencies: Module[] = module.deps;
			let result: any;

			module.executed = EXECUTING;
			let executedDependencies = dependencies.map(function (dependency: Module): any {
				if (result !== ABORT_EXECUTION) {
					// check for keyword dependencies: require, exports, module; then execute module dependency
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

			const factory: Factory = module.def;
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
			forEach(module.loadQ, function (pseudoPluginResource: Module): void {
				// manufacture and insert the real module in modules
				const pluginResourceId: string = resolvePluginResourceId(module, pseudoPluginResource.prid,
					pseudoPluginResource.req);
				const moduleId: string = (module.mid + '!' + pluginResourceId);
				const pluginResource: Module =
					<Module> mix(mix({}, pseudoPluginResource), { mid: moduleId, prid: pluginResourceId });

				if (!modules[moduleId]) {
					// create a new (the real) plugin resource and inject it normally now that the plugin is on board
					injectPlugin((modules[moduleId] = pluginResource));
				} // else this was a duplicate request for the same (plugin, rid)

				// pluginResource is really just a placeholder with the wrong moduleId (because we couldn't calculate it
				// until the plugin was on board) fix() replaces the pseudo module in a resolved dependencies array with the
				// real module lastly, mark the pseudo module as arrived and delete it from modules
				pseudoPluginResource.fix(modules[moduleId]);
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
			for (let module: Module, i = 0; i < executionQueue.length; ) {
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

	function injectPlugin(module: Module): void {
		// injects the plugin module given by module; may have to inject the plugin itself
		const plugin: Module = module.plugin;
		const onLoad = function (def: any): void {
				module.result = def;
				--waitingCount;
				module.executed = true;
				checkComplete();
			};

		if (plugin.load) {
			plugin.load(module.prid, module.req, onLoad);
		}
		else if (plugin.loadQ) {
			plugin.loadQ.push(module);
		}
		else {
			// the unshift instead of push is important: we don't want plugins to execute as
			// dependencies of some other module because this may cause circles when the plugin
			// loadQ is run; also, generally, we want plugins to run early since they may load
			// several other modules and therefore can potentially unblock many modules
			plugin.loadQ = [ module ];
			executionQueue.unshift(plugin);
			injectModule(module, plugin);
		}
	}

	function injectModule(parent: Module, module: Module): void {
		// TODO: This is for debugging, we should bracket it
		if (!module) {
			module = parent;
			parent = null;
		}

		if (module.plugin) {
			injectPlugin(module);
		}
		else if (!module.injected) {
			let cached: Factory;
			const onLoadCallback = function (node?: HTMLScriptElement): void {
				// moduleDefinitionArguments is an array of [dependencies, factory]
				consumePendingCacheInsert(module);

				if (has('loader-ie9-compat') && node) {
					moduleDefinitionArguments = (<any> node).defArgs;
				}

				// non-amd module
				if (!moduleDefinitionArguments) {
					moduleDefinitionArguments = [ [], undefined ];
				}

				defineModule(module, moduleDefinitionArguments[0], moduleDefinitionArguments[1]);
				moduleDefinitionArguments = null;

				guardCheckComplete(function (): void {
					forEach(module.deps, injectModule.bind(null, module));
				});
				checkComplete();
			};

			++waitingCount;
			module.injected = true;
			if ((cached = cache[module.mid])) {
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

	function resolveDependencies(dependencies: string[], module: Module, referenceModule: Module): Module[] {
		// resolve dependencies with respect to this module
		return dependencies.map(function (dependency: string, i: number): Module {
			const result: Module = getModule(dependency, referenceModule);
			if (result.fix) {
				result.fix = function (m: Module): void {
					module.deps[i] = m;
				};
			}
			return result;
		});
	}

	function defineModule(module: Module, dependencies: string[], factory: Factory): Module {
		--waitingCount;
		return initializeModule(module, dependencies, factory);
	}

	function initializeModule(module: Module, dependencies: string[], factory: Factory): Module {
		return <Module> mix(module, {
			def: factory,
			deps: resolveDependencies(dependencies, module, module),
			cjs: {
				id: module.mid,
				uri: module.url,
				exports: (module.result = {}),
				setExports: function (exports: any): void {
					module.cjs.exports = exports;
				}
			}
		});
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

	if (has('host-node')) {
		function loadNodeModule(moduleId: string, parent?: Module): any {
			let module: any = require('module');
			let amdDefine = define;
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
			define = undefined;

			try {
				result = requireModule.nodeRequire(moduleId);
			}
			catch (error) {
				// If the Node.js 'require' function cannot locate a module it will throw "Error: Cannot find module"
				// Leave it to the caller of this function to handle a non-existent module
				// (and throw an error if desired)
				result = undefined;
			}
			finally {
				define = amdDefine;
			}

			return result;
		}

		const vm: any = require('vm');
		const fs: any = require('fs');

		// retain the ability to get node's require
		requireModule.nodeRequire = require;
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void,
							  module: Module, parent?: Module): void {
			fs.readFile(url, 'utf8', function (error: Error, data: string): void {
				if (error) {
					function loadCallback () {
						let result = loadNodeModule(module.mid, parent);

						if (!result) {
							let parentMid = (parent ? ' (parent: ' + parent.mid + ')' : '');

							signal(signals.error, makeSignalError('moduleLoadFail', {
								module,
								url,
								parentMid
							}));

							throw new Error('Failed to load module ' + module.mid + ' from ' + url + parentMid);
						}

						return result;
					}

					moduleDefinitionArguments = [ [], loadCallback ];
				}
				else {
					// global `module` variable needs to be shadowed for UMD modules that are loaded in an Electron
					// webview; in Node.js the `module` variable does not exist when using `vm.runInThisContext`,
					// but in Electron it exists in the webview when Node.js integration is enabled which causes loaded
					// modules to register with Node.js and break the loader
					var oldModule = this.module;
					this.module = undefined;
					try {
						vm.runInThisContext(data, url);
					}
					finally {
						this.module = oldModule;
					}
				}

				callback();
			});
		};

		setGlobals = function (require: Require, define: Define): void {
			module.exports = this.require = require;
			this.define = define;
		};
	}
	else if (has('host-browser')) {
		injectUrl = function (url: string, callback: (node?: HTMLScriptElement) => void, module: Module,
							  parent?: Module): void {
			// insert a script element to the insert-point element with src=url;
			// apply callback upon detecting the script has loaded.
			const node: HTMLScriptElement = document.createElement('script');
			const handler: EventListener = function (event: Event): void {
				document.head.removeChild(node);

				if (event.type === 'load') {
					has('loader-ie9-compat') ? callback(node) : callback();
				}
				else {
					let parentMid = (parent ? ' (parent: ' + parent.mid + ')' : '');

					signal(signals.error, makeSignalError('moduleLoadFail', {
						module,
						url,
						parentMid
					}));

					throw new Error('Failed to load module ' + module.mid + ' from ' + url + parentMid);
				}
			};

			node.addEventListener('load', handler, false);
			node.addEventListener('error', handler, false);

			(<any> node).crossOrigin = 'anonymous';
			node.charset = 'utf-8';
			node.src = url;
			document.head.appendChild(node);
		};

		setGlobals = function (require: Require, define: Define): void {
			this.require = require;
			this.define = define;
		};
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
		requireModule.undef = function (id: string): void {
			if (modules[id]) {
				modules[id] = undefined;
			}
		};
	}

	mix(requireModule, {
		toAbsMid: toAbsMid,
		toUrl: toUrl,

		cache: function (cache: ObjectMap): void {
			consumePendingCacheInsert();
			pendingCacheInsert = cache;
		}
	});

	Object.defineProperty(requireModule, 'baseUrl', {
		get: function (): string {
			return baseUrl;
		},
		enumerable: true
	});

	has.add('loader-cjs-wrapping', true);
	if (has('loader-cjs-wrapping')) {
		var comments: RegExp = /\/\*[\s\S]*?\*\/|\/\/.*$/mg;
		var requireCall: RegExp = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)/g;
	}

	has.add('loader-explicit-mid', true);

	/**
	 * @param deps //(array of commonjs.moduleId, optional)
	 * @param factory //(any)
	 */
	var define: Define = <Define> mix(function (dependencies: string[], factory: Factory): void {
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
				let module: Module = getModule(id);
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
						const newModule: Module = getModule(module.id);
						defineModule(newModule, dependencies, null);
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

		if (has('loader-ie9-compat')) {
			for (let i = document.scripts.length - 1, script: HTMLScriptElement;
				 script = <HTMLScriptElement> document.scripts[i];
				 --i) {
				if ((<any> script).readyState === 'interactive') {
					(<any> script).defArgs = [ dependencies, factory ];
					break;
				}
			}
		}
		else {
			moduleDefinitionArguments = [ dependencies, factory ];
		}
	}, {
		amd: { vendor: 'dojotoolkit.org' }
	});

	setGlobals(requireModule, define);
})();
