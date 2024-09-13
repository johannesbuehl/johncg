// const esbuild = require("esbuild");

import esbuild from "esbuild";

esbuild.build({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	entryPoints: ["./build/pandoc-installer.ts"],
	outfile: "./dist/build/pandoc/pandoc-installer.js",
	tsconfig: "./build/tsconfig.json",
	platform: "node",
	minify: true,
	bundle: true
});
