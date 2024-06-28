import archiver from "archiver";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("Building JohnCG release");
console.log();

// check, wether the build script supports the os
if (!["win32", "linux"].includes(process.platform)) {
	throw new TypeError("Buildscript does not support this OS");
}

// load the package.json
console.log("Reading 'package.json'");
const package_json = JSON.parse(fs.readFileSync("package.json", "utf-8")) as { version: string; dependencies: string[] };

const build_name = `JohnCG_${package_json.version}_${process.platform}`;
console.log(`Building for target '${build_name}'`);

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

console.log(`Build directory is '${build_dir}'`);
console.log(`Release directory is '${release_dir}'`);
console.log();

// clear the build- and release-directory
console.log("Removing build directory");
fs.rmSync(build_dir, { recursive: true, force: true });

if (fs.existsSync(release_dir)) {
	console.log("Removing release directory");
	fs.rmSync(release_dir, { recursive: true, force: true });
}

console.log("Creating building directory");
fs.mkdirSync(build_dir, { recursive: true });

console.log("Creating empty release directory");
fs.mkdirSync(release_dir, { recursive: true });

console.log();

// helper-functions
const copy_build_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(build_dir, dest ?? path.basename(file)));
// const copy_build_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(build_dir, dest ?? path.basename(dir)), { recursive: true, ...args });
const copy_release_file = (file: string, dest?: string) => fs.copyFileSync(file, path.join(release_dir, dest ?? path.basename(file)));
const copy_release_dir = (dir: string, dest?: string, args?: fs.CopySyncOptions) => fs.cpSync(dir, path.join(release_dir, dest ?? path.basename(dir)), { recursive: true, ...args });
const copy_module = (name: string) => {
	console.log(`\t\tCopying '${name}'`);
	copy_release_dir(`node_modules/${name}`, `node_modules/${name}/`);
};

// write the version-number to config/version.ts
const config_ts_path = "src/server/config/version.ts";
console.log(`Writing version '${package_json.version}' to '${config_ts_path}`);
fs.writeFileSync("src/server/config/version.ts", `// eslint-disable-next-line @typescript-eslint/naming-convention
export const Version = "${package_json.version}";\n`);

console.log();

// bundle the different scripts
console.log("Building server");
execSync("npm run server-build");

console.log("Building client");
execSync("npm run client-build");

console.log("Building templates");
execSync("npm run templates-build");

console.log("Building pandoc installer");
execSync("npm run pandoc-build");

// temporary method until there is a solution for packaging sharp
// // create sea-prep.blob
// execSync("node --experimental-sea-config sea-config.json");

// get the node executable
console.log(`Copying node executable to '${build_dir}'`);
copy_build_file(process.execPath, exec_name);

// temporary method until there is a solution for packaging sharp
// // remove the signature from the node executable
// execSync(`'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe' remove /s dist/build/${exec_name}`);
// // modify the node executable
// execSync(`npx postject dist/build/${exec_name} NODE_SEA_BLOB dist/build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);

console.log();
console.log(`Copying files to '${release_dir}'`);

console.log(`\tCopying 'config_default.yaml' to '${path.join(release_dir, "config.yaml")}'`);
copy_release_dir("config_default.yaml", "config.yaml");

// copy the file to the output
console.log(`\tCopying node executable`);
copy_release_file(path.join(build_dir, exec_name));

console.log(`\tCopying server-script '${path.join(build_dir, "main.js")}'`);
copy_release_file(path.join(build_dir, "main.js"));

console.log(`\tCopying example files`);
fs.readdirSync("files").forEach((dir) => {
	console.log(`\t\tCopying '${path.join("files", dir)}'`);
	copy_release_dir(path.join("files", dir));
});

console.log(`\tCopying '${path.join(build_dir, "client")}'`);
copy_release_dir(path.join(build_dir, "client"));

console.log("\tCopying CasparCG-templates");
copy_release_dir(path.join(build_dir, "Templates"));

console.log("\tCopying CasparCG-media");
copy_release_dir("casparcg/Media");

console.log("\tCopying pandoc-installer");
copy_release_dir(path.join(build_dir, "pandoc"));

console.log("\tCopying texlive-profile");
copy_release_file("pandoc/texlive.profile", "pandoc/texlive.profile");

console.log("\tCopying external node-modules");

copy_module("@img");

copy_module("canvas");

copy_module("pdfjs-dist");

copy_module("hidefile");

console.log();

// temporary method until there is a solution for packaging sharp
// create a script-file, that start node with the main.js
console.log("Creating startup-script for the server");
create_launch_script("main.js", build_name);

console.log("Creating startup-script for the pandoc-installer");
create_launch_script("pandoc-installer.js", "pandoc/install");

// create and copy the licenses
console.log("Creating node-module licence-report");
try {
	execSync("npx license-reporter --config build-scripts/license-reporter.config.ts");
} catch (e) { /* empty */ }

// eslint-disable-next-line @typescript-eslint/naming-convention
interface License { name: string; licenseText: string }

console.log("Loading licence-report");
const licenses_orig = JSON.parse(fs.readFileSync("build-scripts/3rdpartylicenses.json", "utf-8")) as License[];

const licenses: Record<string, License> = {};

licenses_orig.forEach((pack) => {
	licenses[pack.name] = pack;
});

console.log("Creating licence-directory");
fs.mkdirSync("dist/build/licenses");

console.log("Writing licences");
Object.keys(package_json.dependencies).forEach((pack) => {
	const lic = licenses[pack];

	console.log(`\t'${lic.name}'`);

	try {
		fs.writeFileSync(`dist/build/licenses/${lic.name}.txt`, lic.licenseText, "utf-8");
	} catch (e) {
		if (lic.licenseText === undefined) {
			throw new EvalError(`ERROR: no license was found for the package '${lic.name}'`);
		}
	}
});

console.log("Writing JohnCG-licene")
copy_release_file("LICENSE", "LICENSE.txt");

// copy the licenses
console.log(`Copying licences to '${release_dir}'`);
copy_release_dir(path.join(build_dir, "licenses"));

console.log();

// pack the files
console.log(`Packing release to '${release_dir}.zip'`);
const zip_stream = fs.createWriteStream(release_dir + ".zip");

const archive = archiver("zip");

archive.pipe(zip_stream);

archive.directory(release_dir, false);

void archive.finalize();

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