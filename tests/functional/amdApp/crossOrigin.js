(function() {
	var scripts = document.getElementsByTagName('script'), i;

	for (i = 0; i < scripts.length; i++) {
		var script = scripts[i];

		if (script.src && script.src.indexOf('crossOrigin.js') >= 0) {
			window.crossOriginResult = {
				node: script,
				value: script.crossOrigin
			};
		}
	}
})();
