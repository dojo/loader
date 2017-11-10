declare const shimAmdDependencies: any;

require.config(shimAmdDependencies({
	baseUrl: '../../../',
	packages: [
		{name: 'amdApp', location: '_build/tests/functional/amdApp'},
		{name: 'dojo', location: '//ajax.googleapis.com/ajax/libs/dojo/1.10.4/dojo'}
	]
}));

require(['@dojo/shim/main'], function () {
    require([
    	'amdApp/app',
    	'dojo/debounce'
    ], function(app, debounce) {
    	window.location.href = 'csp-success.html#' + typeof debounce;
    });
});
