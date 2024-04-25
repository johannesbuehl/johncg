const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./build-scripts/pandoc-installer.ts"],
	outfile: "./dist/build/pandoc/pandoc-installer.js",
	tsconfig: "./build-scripts/tsconfig.json",
	platform: "node",
	minify: true,
	bundle: true
});
