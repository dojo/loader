define([
	'require',
	'toUrlTest'
], function (contextRequire, toUrlTest) {
	var assert = toUrlTest.assert;

	toUrlTest.dfd.callback(function () {
		assert.strictEqual(require.toAbsMid('mid'), 'mid');
		assert.strictEqual(require.toAbsMid('./mid'), 'mid');
		assert.strictEqual(require.toAbsMid('common/mid'), 'common/mid');

		assert.strictEqual(contextRequire.toAbsMid('mid'), 'mid');
		assert.strictEqual(contextRequire.toAbsMid('./mid'), 'common/a/mid');
		assert.strictEqual(contextRequire.toAbsMid('../mid'), 'common/mid');
		assert.strictEqual(contextRequire.toAbsMid('package/mid'), 'package/mid');
		assert.strictEqual(contextRequire.toAbsMid('./package/mid'), 'common/a/package/mid');
		assert.strictEqual(contextRequire.toAbsMid('../package/mid'), 'common/package/mid');
	})();
});
