require.config({
	packages: [
		{name: 'amdApp', location: './amdApp'}
	]
});

require([
	'amdApp/app'
], function(app) {
	window.loaderTestResults = {
		message: app.getMessage()
	};
});
