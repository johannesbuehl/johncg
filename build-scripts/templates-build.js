const esbuild = require("esbuild");

esbuild.build({
	entryPoints: ["./src/templates/*.ts"],
	outdir: "./casparcg/Templates/JohnCG/",
	tsconfig: "./src/templates/tsconfig.json",
	target: "chrome117",
	sourcemap: true,
	minify: true
});
