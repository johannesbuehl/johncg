const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./src/server/main.ts"],
	outfile: "./out/main.js",
	tsconfig: "./src/server/tsconfig.json",
	platform: "node",
	bundle: true,
	sourcemap: true,
	external: [
		"pdfjs-dist",
		"canvas"
	]
});