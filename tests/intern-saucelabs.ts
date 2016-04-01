export * from './intern';

export var capabilities = {
	project: 'Dojo 2',
	name: 'dojo-loader',
	fixSessionCapabilities: false
};

export var environments = [
	{ browserName: 'internet explorer', version: [ '9.0', '10.0', '11.0' ], platform: 'Windows 7' }/*,
	{ browserName: 'microsoftedge', platform: 'Windows 10' }*/,
	{ browserName: 'firefox', platform: 'Windows 10' },
	{ browserName: 'chrome', platform: 'Windows 10' },
	{ browserName: 'safari', version: '9', platform: 'OS X 10.11' },
	{ browserName: 'android', platform: 'Linux', version: '4.4', deviceName: 'Google Nexus 7 HD Emulator' }/*,
	{ browserName: 'safari', version: '7', platform: 'OS X 10.9' }*/
];

/* SauceLabs supports more max concurrency */
export const maxConcurrency = 4;

export const tunnel = 'SauceLabsTunnel';
