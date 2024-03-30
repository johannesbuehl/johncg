const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

esbuild.build({
	entryPoints: ["./src/templates/*.ts"],
	outdir: "./dist/build/Templates/JohnCG/",
	tsconfig: "./src/templates/tsconfig.json",
	target: "chrome117",
	minify: true
});

fs.cpSync("casparcg/Templates", "dist/build/Templates", { recursive: true, filter: (src) => {
	
	switch (true) {
		case ".eslintrc" === src:
		case [".map", ".js"].includes(path.extname(src)):
			return false;
		default:
			return true;
	}
} });