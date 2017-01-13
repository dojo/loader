require.config({
	packages: [
		{name: 'amdApp', location: './amdApp'}
	]
});

require([
	'amdApp/app'
], function(app) {
	(<any> window).loaderTestResults = {
		message: app.getMessage()
	};
});
