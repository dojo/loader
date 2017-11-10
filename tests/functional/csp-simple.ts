require.config(shimAmdDependencies({
	baseUrl: '../../../',
	packages: [
		{name: 'amdApp', location: '_build/tests/functional/amdApp'}
	]
}));

require(['@dojo/shim/main'], function () {
    require([
    	'amdApp/app'
    ], function(app) {
    	window.location.href = 'csp-success.html';
    });
});
