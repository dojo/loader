import { IRequire } from './loader';

/* 
 * Strips <?xml ...?> declarations so that external SVG and XML
 * documents can be added to a document without worry. Also, if the string
 * is an HTML document, only the part inside the body tag is returned.
 */
function strip(text: string): string {
	if (!text) {
		return '';
	}

	text = text.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, '');
	let matches = text.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
	text = matches ? matches[1] : text;

	return text;
}

/*
 * Host-specific method to retrieve text
 */
let getText: (url: string, callback: (value: string) => void) => void;

if (typeof document !== 'undefined' && typeof location !== 'undefined') {
	// This function is needed so onreadystatechange can be set to something
	// that doesn't form a closure around the XHR object and form a circular
	// reference
	const noop = function () {};
	getText = function(url: string, callback: (value: string) => void): void {
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				xhr.onreadystatechange = noop;
				callback(xhr.responseText);
			}
		};
		xhr.open('GET', url, true);
		xhr.send(null);
	};
}
else if (typeof process === 'object' && process.versions && process.versions.node) {
	let fs = (<any> require).nodeRequire ? (<any> require).nodeRequire('fs') : require('fs');
	getText = function(url: string, callback: (value: string) => void): void {
		fs.readFile(url, { encoding: 'utf8' }, function(error: Error, data: string): void {
			if (error) {
				throw error;
			}

			callback(data);
		});
	};
}
else {
	getText = function(): void {
		throw new Error('dojo/text not supported on this platform');
	};
}

/*
 * Cache of previously-loaded text resources
 */
let textCache: { [key: string]: any; } = {};

/*
 * Cache of pending text resources
 */
let pending: { [key: string]: any; } = {};

export function normalize(id: string, toAbsMid: (moduleId: string) => string): string {
	let parts = id.split('!');
	let url = parts[0];

	return (/^\./.test(url) ? toAbsMid(url) : url) + (parts[1] ? '!' + parts[1] : '');
}

export function load(id: string, require: IRequire, load: (value?: any) => void): void {
	let parts = id.split('!');
	let stripFlag = parts.length > 1;
	let mid = parts[0];
	let url = require.toUrl(mid);
	let text: string;

	function finish(text: string): void {
		load(stripFlag ? strip(text) : text);
	}

	if (mid in textCache) {
		text = textCache[mid];
	}
	else if (url in textCache) {
		text = textCache[url];
	}

	if (!text) {
		if (pending[url]) {
			pending[url].push(finish);
		} else {
			let pendingList = pending[url] = [finish];
			getText(url, function(value: string) {
				textCache[mid] = textCache[url] = value;
				for (let i = 0; i < pendingList.length;) {
					pendingList[i++](value);
				}
				delete pending[url];
			});
		}
	} else {
		finish(text);
	}
}
