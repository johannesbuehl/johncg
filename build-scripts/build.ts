import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import tar from "tar";

// check, wether the build script supports the os
if (!["win32", "linux"].includes(process.platform)) {
	throw new TypeError("Buildscript does not support this OS");
}

// load the package.json
const package_json = JSON.parse(fs.readFileSync("package.json", "utf-8")) as { version: string; dependencies: string[] };

const build_name = `JohnCG_${package_json.version}_${process.platform}`;

let exec_name: string;
switch (process.platform) {
	case "win32":
		// temporary method until there is a solution for packaging sharp
		// const exec_name = build_name + ".exe";
		exec_name = "node.exe";
		break;
	case "linux":
		exec_name = "node";
		break;
}
const build_dir = "dist/build";
const release_dir = path.join("dist", build_name);

// clear the build- and release-directory
fs.rmSync(build_dir, { recursive: true, force: true });
fs.rmSync(release_dir, { recursive: true, force: true });
fs.mkdirSync(build_dir, { recursive: true });
fs.mkdirSync(release_dir, { recursive: true });

const copy_build_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(build_dir, dest ?? path.basename(file)));
// const copy_build_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(build_dir, dest ?? path.basename(dir)), { recursive: true, ...args });
const copy_release_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(release_dir, dest ?? path.basename(file)));
const copy_release_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(release_dir, dest ?? path.basename(dir)), { recursive: true, ...args });

// bundle the different scripts
execSync("npm run server-build");
execSync("npm run client-build");
execSync("npm run templates-build");
execSync("npm run pandoc-build");

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

copy_release_dir("config_default.yaml", "config.yaml");

// copy the file to the output
copy_release_file(path.join(build_dir, exec_name));
copy_release_file(path.join(build_dir, "main.js"));
fs.readdirSync("files").forEach((dir) => copy_release_dir(path.join("files", dir)));
copy_release_dir(path.join(build_dir, "client"));
const copy_module = (name: string) => {
	copy_release_dir(`node_modules/${name}`, `node_modules/${name}/`);

};
copy_release_dir(path.join(build_dir, "Templates"));
copy_release_dir("casparcg/Media");
copy_release_dir(path.join(build_dir, "pandoc"));
copy_release_file("pandoc/texlive.profile", "pandoc/texlive.profile");
copy_module("@img");
copy_module("canvas");
copy_module("pdfjs-dist");

// temporary method until there is a solution for packaging sharp
// create a script-file, that start node with the main.js
create_launch_script("main.js", build_name);
create_launch_script("pandoc-installer.js", "pandoc/install");

// create and copy the licenses
// void lr.cli(["--config=build-scripts/license-reporter.config.ts"]);
try {
	execSync("npx license-reporter --config build-scripts/license-reporter.config.ts");
} catch (e) { /* empty */ }

// eslint-disable-next-line @typescript-eslint/naming-convention
interface License { name: string; licenseText: string }
const licenses_orig = JSON.parse(fs.readFileSync("build-scripts/3rdpartylicenses.json", "utf-8")) as License[];

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
void tar.c({ gzip: true, file: release_dir + ".tar.br", cwd: "dist" }, [path.relative("dist", release_dir)]);

function create_launch_script(pth: string, destination: string) {
	const relative_path_prefix = "../".repeat((destination.match(/\//g) ?? []).length);

	switch (process.platform) {
		case "win32": {
				fs.writeFileSync(path.join(release_dir, destination + ".bat"), `@echo off\ncd /D "%~dp0"\n${relative_path_prefix.replaceAll("/", "\\")}${exec_name} ${pth}\npause\n`);
			}
			break;
		case "linux":
			fs.writeFileSync(path.join(release_dir, destination + ".sh"), `${relative_path_prefix}./${exec_name} ${pth}\nread -n1 -r -p "Press any key to continue..." key`);
			break;
	}
}