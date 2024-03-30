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
	if (path.extname(src) === ".html" || fs.statSync(src).isDirectory()) {
		return true;
	} else {
		return false;
	}
} });