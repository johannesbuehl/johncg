const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./build/pandoc-installer.ts"],
	outfile: "./dist/build/pandoc/pandoc-installer.js",
	tsconfig: "./build/tsconfig.json",
	platform: "node",
	minify: true,
	bundle: true
});
