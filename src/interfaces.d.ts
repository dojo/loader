declare namespace DojoLoader {

	/**
	 * Common AMD Configuration
	 *
	 * See [Common Config](https://github.com/amdjs/amdjs-api/blob/master/CommonConfig.md)
	 */
	export interface Config {
		/**
		 * Indicates the root used for ID-to-path resolutions. Relative paths are relative to the current
		 * working directory. In web browsers, the current working directory is the directory containing
		 * the web page running the script.
		 */
		baseUrl?: string;

		/**
		 * Specifies for a given module ID prefix, what module ID prefix to use in place of another
		 * module ID prefix. For example, how to express "when `bar` asks for module ID `foo`,
		 * actually use module ID 'foo1.2'".
		 *
		 * This sort of capability is important for larger projects which may have two sets of
		 * modules that need to use two different versions of `foo`, but they still need to
		 * cooperate with each other.
		 *
		 * This is different from `paths` config. `paths` is only for setting up root paths for
		 * module IDs, not for mapping one module ID to another one.
		 */
		map?: ModuleMap;

		/**
		 * Array of package configuration (packageConfig) objects. Package configuration is for
		 * traditional CommonJS packages, which has different path lookup rules than the default
		 * ID-to-path lookup rules used by an AMD loader.
		 *
		 * Default lookup rules are ,baseUrl + 'module/id' + .js, where paths config can be used
		 * to map part of 'module/id' to another path.
		 */
		packages?: Package[];

		/**
		 * For specifying a path for a the given module ID prefix.
		 *
		 * A property in the paths object is an absolute module ID prefix.
		 */
		paths?: { [ path: string ]: string; };

		/* TODO: We should remove internal APIs like this */
		pkgs?: { [ path: string ]: Package; };

		shim?: { [path: string]: ModuleShim | string[] };

		crossOrigin?: false | 'anonymous' | 'use-credentials';
	}

	interface Define {
		(moduleId: string, dependencies: string[], factory: Factory): void;
		(dependencies: string[], factory: Factory): void;
		(factory: Factory): void;
		(value: any): void;
		amd: { [prop: string]: string | number | boolean };
	}

	interface Factory {
		(...modules: any[]): any;
	}

	interface Has {
		(name: string): any;
		add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any,
			now?: boolean, force?: boolean): void;
		add(name: string, value: any, now?: boolean, force?: boolean): void;
	}

	interface LoaderError extends Error {
		readonly src: string;
		readonly info: { module: Module, url: string, parentMid: string };
	}

	/**
	 * AMD Loader Plugin API
	 *
	 * See [Loader Plugin API](https://github.com/amdjs/amdjs-api/blob/master/LoaderPlugins.md)
	 */
	interface LoaderPlugin {
		/**
		 * A function that is called to load a resource. This is the only mandatory API method that needs
		 * to be implemented for the plugin to be useful, assuming the resource IDs do not need special
		 * ID normalization.
		 * @param resourceId The resource ID that the plugin should load. This ID MUST be normalized.
		 * @param require A local require function to use to load other modules. This require function
		 *                has some utilities on it:
		 *                * **require.toUrl('moduleId+extension')** See the `require.toUrl` API notes
		 *                  for more information.
		 * @param load A function to call once the value of the resource ID has been determined. This
		 *             tells the loader that the plugin is done loading the resource.
		 * @param config A configuration object. This is a way for the optimizer and the web app to
		 *               pass configuration information to the plugin. An optimization tool may set
		 *               an `isBuild` property in the config to true if this plugin is being called
		 *               as part of an optimizer build.
		 */
		load?(resourceId: string, require: Require, load: (value?: any) => void, config?: { [ prop: string ]: any; }): void;

		/**
		 * A function to normalize the passed-in resource ID. Normalization of an module ID normally
		 * means converting relative paths, like `./some/path` or `../another/path` to be non-relative,
		 * absolute IDs
		 * @param resourceId The resource ID to normalize.
		 * @param normalize A normalization function that accepts a string ID to normalize using the
		 *                  standard relative module normalization rules using the loader's current
		 *                  configuration.
		 */
		normalize?(resourceId: string, normalize: (moduleId: string) => string): string;
	}

	interface MapItem extends Array<any> {
		/* prefix */      0: string;
		/* replacement */ 1: any;
		/* regExp */      2: RegExp;
		/* length */      3: number;
	}

	interface MapReplacement extends MapItem {
		/* replacement */ 1: string;
	}

	interface MapRoot extends Array<MapSource> {
		star?: MapSource;
	}

	interface MapSource extends MapItem {
		/* replacement */ 1: MapReplacement[];
	}

	// TODO are we still abbreviating these properties?
	// TODO shouldn't extend for LoaderPlugin because technically `load` is not optional
	interface Module extends LoaderPlugin {
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

	interface ModuleDefinitionArguments extends Array<any> {
		0: string[];
		1: Factory;
	}

	interface ModuleMap extends ModuleMapItem {
		[ sourceMid: string ]: ModuleMapReplacement | string;
	}

	interface ModuleMapItem {
		[ mid: string ]: /* ModuleMapReplacement | ModuleMap */ any;
	}

	interface ModuleMapReplacement extends ModuleMapItem {
		[ findMid: string ]: /* replaceMid */ string;
	}

	interface ObjectMap { [ key: string ]: any; }

	interface Package {
		location?: string;
		main?: string;
		name?: string;
	}

	interface PackageMap {
		[ packageId: string ]: Package;
	}

	interface PathMap extends MapReplacement {}

	interface ModuleShim {
		deps?: string[];
		exports?: string;
		init?: (...dependencies: any[]) => any;
	}

	interface Require {
		(dependencies: string[], callback: RequireCallback): void;
		<ModuleType>(moduleId: string): ModuleType;

		toAbsMid(moduleId: string): string;
		toUrl(path: string): string;
	}

	interface RequireCallback {
		(...modules: any[]): void;
	}

	interface RootRequire extends Require {
		has: Has;
		on(type: SignalType, listener: any): { remove: () => void };
		config(config: Config): void;
		inspect?(name: string): any;
		nodeRequire?(id: string): any;
		undef(moduleId: string): void;
	}

	type SignalType = 'error';
}

declare const define: DojoLoader.Define;

declare interface NodeRequire {
	(dependencies: string[], callback: DojoLoader.RequireCallback): void;

	config(config: DojoLoader.Config): void;
	has: DojoLoader.Has;
	inspect?(name: string): any;
	nodeRequire?: NodeRequire;
	on(type: DojoLoader.SignalType, listener: any): { remove: () => void };
	toAbsMid(moduleId: string): string;
	toUrl(path: string): string;
	undef(moduleId: string): void;
}

declare const arguments: IArguments;
