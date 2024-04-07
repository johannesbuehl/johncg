const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./build-scripts/build.ts"],
	outfile: "./build-scripts/build.js",
	tsconfig: "./build-scripts/tsconfig.json",
	platform: "node",
	bundle: true
});