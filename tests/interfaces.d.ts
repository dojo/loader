declare namespace NodeJS {
	interface Global {
		require: DojoLoader.RootRequire;
		define: DojoLoader.Define;
	}
}
