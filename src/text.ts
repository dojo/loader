import { IRequire } from './loader';
import request, { Response } from 'dojo-core/request';

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
			request.get(url).then(function (response: Response<string>) {
				textCache[mid] = textCache[url] = response.data;
				for (var i = 0; i < pendingList.length;) {
					pendingList[i++](response.data);
				}
				delete pending[url];
			});
		}
	} else {
		finish(text);
	}
}
