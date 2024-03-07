import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import tar from "tar";

import type { ConfigJSON } from "../../src/server/config.ts";

// load the package.json
const package_json = JSON.parse(fs.readFileSync("package.json", "utf-8")) as { version: string; dependencies: string[] };

const build_name = "JohnCG_" + package_json.version;
// temporary method until there is a solution for packaging sharp
// const exec_name = build_name + ".exe";
const exec_name = "node.exe";
const build_dir = "dist/build";
const release_dir = path.join("dist", build_name);

// clear the build-directory
fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync(build_dir, { recursive: true });
fs.mkdirSync(path.join("dist", build_name), { recursive: true });

const copy_build_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(build_dir, dest ?? path.basename(file)));
// const copy_build_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(build_dir, dest ?? path.basename(dir)), { recursive: true, ...args });
const copy_release_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(release_dir, dest ?? path.basename(file)));
const copy_release_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(release_dir, dest ?? path.basename(dir)), { recursive: true, ...args });

// bundle the different scripts
execSync("npm run build-server");
execSync("npm run build-client");
execSync("npm run build-templates");

// temporary method until there is a solution for packaging sharp
// // create sea-prep.blob
// execSync("node --experimental-sea-config sea-config.json");

// get the node executable
copy_build_file(process.execPath, exec_name);

// temporary method until there is a solution for packaging sharp
// // remove the signature from the node executable
// execSync(`'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe' remove /s dist/build/${exec_name}`);
// // modify the node executable
// execSync(`npx postject dist/build/${exec_name} NODE_SEA_BLOB dist/build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);

// load the config-file, censor the file-paths and store it for the relase
const config_file = JSON.parse(fs.readFileSync("config.json", "utf-8")) as ConfigJSON;
config_file.path = {
	background_image: "C:/path/to/image/directory",
	song: "D:/path/to/song/directory"
};
config_file.casparcg.templates = "e:/path/to/the/casparcg/templates/directory";
fs.writeFileSync(path.join(release_dir, "config.json"), JSON.stringify(config_file, undefined, "\t"));

// copy the file to the output
copy_release_file(path.join(build_dir, exec_name));
copy_release_file(path.join(build_dir, "main.js"));

copy_release_dir("casparcg-templates", undefined, { filter: (src) => {
	switch (true) {
		case path.basename(src) === ".eslintrc":
		case [".js", ".map"].includes(path.extname(src)):
			return false;
		default:
			return true;
	}
} });
copy_release_dir("client", undefined, { filter: (src) => {
	switch (true) {
		case [".eslintrc", "bahnschrift.ttf"].includes(path.basename(src)):
		case [".js", ".map"].includes(path.extname(src)):
			return false;
		default:
			return true;
	}
} });
const copy_module = (name: string) => {
	copy_release_dir(`node_modules/${name}`, `node_modules/${name}/`);

};
copy_module("@img");
copy_module("canvas");
copy_module("pdfjs-dist");

// temporary method until there is a solution for packaging sharp
// create a batch file, that start node with the main.js
fs.writeFileSync(path.join(release_dir, build_name + ".bat"), `${exec_name} main.js\npause`);

// create and copy the licenses
// void lr.cli(["--config=build/scripts/license-reporter.config.ts"]);
try {
	execSync("npx license-reporter --config build/scripts/license-reporter.config.ts");
} catch (e) { /* empty */ }

// eslint-disable-next-line @typescript-eslint/naming-convention
interface License { name: string; licenseText: string }
const licenses_orig = JSON.parse(fs.readFileSync("build/scripts/3rdpartylicenses.json", "utf-8")) as License[];

const licenses: Record<string, License> = {};

licenses_orig.forEach((pack) => {
	licenses[pack.name] = pack;
});

fs.mkdirSync("dist/build/licenses");

Object.keys(package_json.dependencies).forEach((pack) => {
	const lic = licenses[pack];

	try {
		fs.writeFileSync(`dist/build/licenses/${lic.name}.txt`, lic.licenseText, "utf-8");
	} catch (e) {
		if (lic.licenseText === undefined) {
			throw new EvalError(`ERROR: no license was found for the package '${lic.name}'`);
		}
	}
});

copy_release_file("LICENSE", "LICENSE.txt");

// copy the licenses
copy_release_dir(path.join(build_dir, "licenses"));

// pack the files in a .tar.gz-file
void tar.c({ gzip: true, file: release_dir + ".tar.gz", cwd: "dist" }, [path.relative("dist", release_dir)]);