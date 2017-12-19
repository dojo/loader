export function isEventuallyRejected<T>(promise: Promise<T>): Promise<boolean> {
	return promise.then<any>(
		function() {
			throw new Error('unexpected code path');
		},
		<any>(() => {
			return true; // expect rejection
		})
	);
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}
