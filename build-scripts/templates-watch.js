const esbuild = require("esbuild");

async function watch() {
	const ctx = await esbuild.context({
		entryPoints: ["./src/templates/*.ts"],
		outdir: "./casparcg/Templates/JohnCG/",
		tsconfig: "./src/templates/tsconfig.json",
		target: "chrome117",
		sourcemap: true
	});
	
	await ctx.watch();
	console.log("watching...");
}

watch();
