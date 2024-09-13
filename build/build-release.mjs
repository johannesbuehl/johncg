import esbuild from "esbuild";
import yaml from "yaml";
import fs from "fs";
import path from "path";

const build_config = yaml.parse(fs.readFileSync(path.join(__dirname, "build_config.yaml"), "utf-8"));

// set the config-number in the build-config and version.json
const package_json = JSON.parse(fs.readFileSync(build_config.package_json ?? "package.json", "utf-8"));

build_config.builds.server.script_path = `JohnCG_${package_json.version}_${process.platform}`;

fs.writeFileSync(path.join(__dirname, "build_config.yaml"), yaml.stringify(build_config));

fs.writeFileSync("src/version.ts", `export const Version = "${package_json.version}";\n`);

esbuild.build({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	entryPoints: ["./build/release.ts"],
	outfile: "./build/release.js",
	tsconfig: "./build/tsconfig.json",
	platform: "node",
	bundle: true
});
