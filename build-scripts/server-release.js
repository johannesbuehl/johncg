const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./src/server/main.ts"],
	outfile: "./dist/build/main.js",
	tsconfig: "./src/server/tsconfig.json",
	platform: "node",
	minify: true,
	bundle: true,
	external: [
		"pdfjs-dist",
		"canvas"
	]
});
