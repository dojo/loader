require.config({
	packages: [
		{name: 'amdApp', location: './amdApp'}
	]
});

require([
	'amdApp/app'
], function(app) {
	window.location.href = 'csp-success.html';
});
