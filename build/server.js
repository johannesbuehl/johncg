const esbuild = require("esbuild");
const fs = require("fs");

if (process.argv.length !== 3 || !["debug", "release"].includes(process.argv[2])) {
	process.exit(1);
}

const package_json = JSON.parse(fs.readFileSync("package.json", "utf-8"));

const esbuild_settings = {
	entryPoints: ["src/server/main.ts"],
	tsconfig: "src/server/tsconfig.json",
	platform: "node",
	bundle: true,
	keepNames: true,
	external: [
		"pdfjs-dist",
		"canvas",
		"hidefile"
	]
};

if (process.argv[2] === "debug") {
	esbuild_settings.outdir = "out";
	esbuild_settings.sourcemap = true;
} else {
	esbuild_settings.outdir = "dist/build";
	esbuild_settings.minify = true;
}

esbuild.build(esbuild_settings);