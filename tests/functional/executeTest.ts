import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

export default function (suite: Suite, htmlTestPath: string, testFunction: (result: any) => void,
						timeout = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(htmlTestPath))
		.then(pollUntil<any>(function () {
			return (<any> window).loaderTestResults;
		}, undefined, timeout), undefined)
		.then(testFunction, function () {
			throw new Error('loaderTestResult was not set.');
		});
}
