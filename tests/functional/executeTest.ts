import Test from 'intern/lib/Test';
import Command from '@theintern/leadfoot/Command';
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

export default function (test: Test, require: NodeRequire, htmlTestPath: string,
						testFunction: (result: any) => void, timeout = 10000): Command<any> {
	return test.remote
		.get(require.resolve(htmlTestPath))
		.then(pollUntil(function () {
			return (<any> window).loaderTestResults;
		}, undefined, timeout), undefined)
		.then(testFunction, function () {
			throw new Error('loaderTestResult was not set.');
		});
}
