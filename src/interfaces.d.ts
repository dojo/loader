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

export interface LoaderError extends Error {
	src: string;
	info: { module: Module, url: string };
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

export interface ModuleDefinitionArguments extends Array<any> {
	0: string[];
	1: Factory;
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

export interface ObjectMap { [ key: string ]: any; }

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
	on(type: SignalType, listener: any): { remove: () => void };
	config(config: Config): void;
	inspect?(name: string): any;
	nodeRequire?(id: string): any;
	undef(moduleId: string): void;
}

export type SignalType = 'error';
