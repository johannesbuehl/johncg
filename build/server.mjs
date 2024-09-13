import esbuild from "esbuild";

if (process.argv.length !== 3 || !["debug", "release"].includes(process.argv[2])) {
	process.exit(1);
}

const esbuild_settings = {
	/* eslint-disable @typescript-eslint/naming-convention */
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
	/* eslint-enable @typescript-eslint/naming-convention */
};

if (process.argv[2] === "debug") {
	esbuild_settings.outdir = "out";
	esbuild_settings.sourcemap = true;
} else {
	esbuild_settings.outdir = "dist/build";
	esbuild_settings.minify = true;
}

esbuild.build(esbuild_settings);