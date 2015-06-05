declare module 'intern/dojo/node!leadfoot/helpers/pollUntil' {
	import pollUntil = require('leadfoot/helpers/pollUntil');
	export = pollUntil;
}

declare module 'intern/dojo/node!fs' {
	import fs = require('fs');
	export = fs;
}

declare module 'intern/dojo/node!module' {
	// TODO: uhhhh... rename module.d.ts??
	import module = require('module');
	export = module;
}

declare module 'intern/dojo/node!path' {
	import path = require('path');
	export = path;
}

declare module 'intern/dojo/node!vm' {
	import vm = require('vm');
	export = vm;
}
