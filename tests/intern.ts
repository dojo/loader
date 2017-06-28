export const proxyPort = 9000;

// A fully qualified URL to the Intern proxy
export const proxyUrl = 'http://localhost:9000/';

// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
export const capabilities = {
	project: 'Dojo 2',
	name: '@dojo/loader',
	fixSessionCapabilities: false
};

// Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
// OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
// capabilities options specified for an environment will be copied as-is
export const environments = [
	{ browserName: 'internet explorer', version: '11', platform: 'WINDOWS' },
	{ browserName: 'edge', platform: 'WINDOWS' },
	{ browserName: 'firefox', version: '52', platform: 'WINDOWS' },
	{ browserName: 'chrome', platform: 'WINDOWS' },
	{ browserName: 'safari', version: '10', platform: 'MAC' } /* ,
	{ browserName: 'iPad', version: '9.1' } */
	/* issues with iOS 9.1 and BrowserStack */
];

// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
export const maxConcurrency = 5;

// Name of the tunnel class to use for WebDriver tests
export const tunnel = 'BrowserStackTunnel';

export const loaders = {
	'host-browser': 'node_modules/@dojo/loader/loader.js',
	'host-node': '@dojo/loader'
};

// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
// can be used here
export const loaderOptions = {
	// Packages that should be registered with the loader in each testing environment
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'tests', location: '_build/tests' },
		{ name: 'dojo', location: 'node_modules/intern/browser_modules/dojo' },
		{ name: 'grunt-dojo2', location: 'node_modules/grunt-dojo2'}
	]
};

// Non-functional test suite(s) to run in each browser
export const suites = [ 'tests/unit/all' ];

// Functional test suite(s) to run in each browser once non-functional tests are completed
export const functionalSuites = [ 'tests/functional/all' ];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const excludeInstrumentation = /(?:node_modules|bower_components|tests)[\/\\]/;
