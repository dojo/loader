declare function importScripts(url: string): void;

onmessage = function (e) {
	try {
		/* load the loader */
		importScripts('../../src/loader.js');

		require.config({
			packages: [
				{ name: 'amdApp', location: './amdApp' }
			]
		});

		require([
			'amdApp/app'
		], function (app) {
			/* post message back with the results */
			(<any> postMessage)({
				message: app.getMessage()
			});
		});
	}
	catch (e) {
		(<any> postMessage)({
			message: e.message,
			status: 'fail'
		});
		throw e;
	}
};
