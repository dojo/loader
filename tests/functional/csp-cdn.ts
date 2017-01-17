require.config({
	packages: [
		{name: 'amdApp', location: './amdApp'},
		{name: 'dojo', location: '//ajax.googleapis.com/ajax/libs/dojo/1.10.4/dojo'}
	]
});

require([
	'amdApp/app',
	'dojo/debounce'
], function(app, debounce) {
	window.location.href = 'csp-success.html#' + typeof debounce;
});
