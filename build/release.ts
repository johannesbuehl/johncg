import archiver from "archiver";
import { execSync } from "child_process";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { CopyOptions } from "fs";
import path from "path";
import tmp from "tmp";
import yaml from "yaml";
import Ajv, { JSONSchemaType } from "ajv";
import formatsPlugin from "ajv-formats";
import { unzipSync } from "fflate";
import { env } from "process";
import tar from "tar-stream";
import { pipeline } from "stream/promises";
import { XzReadableStream } from "xz-decompress";

/* eslint-disable @typescript-eslint/no-unused-vars */
interface DownloadFileDefinition {
	type: "zip" | "tar.xz";
	src: string;
	os?: NodeJS.Platform;
	files: { src: string; dest?: string }[];
}
interface Config {
	node_version: string;
	release_dir: string;
	builds: Record<
		string,
		{ script: string; files: string[] } & (
			| Record<string, never>
			| { script_path?: string; entry: string }
		)
	>;
	license_report: {
		config: { output: string };
		path: string;
		license: { path: string; destination?: string };
	};
	mkdir?: string[];
	copy?: { orig: string; dest?: string; os?: NodeJS.Platform }[];
	download_files?: DownloadFileDefinition[];
	external_packages?: string[];
	package_json?: string;
	configs?: Record<string, { schema: string; orig: string; dest?: string }>;
	keep?: boolean;
}

void (async () => {
	const ajv = new Ajv();
	formatsPlugin(ajv);
	const validate_config = ajv.compile(
		JSON.parse(
			await fs.readFile(path.join(__dirname, "build_config.schema.json"), "utf-8")
		) as JSONSchemaType<Config>
	);

	const config = yaml.parse(
		await fs.readFile(path.join(__dirname, "build_config.yaml"), "utf-8")
	) as Config;
	if (!validate_config(config)) {
		const errors = validate_config.errors
			?.map((error) => `${error.instancePath}: ${error.message}`)
			.join(", ");

		console.error(`invalid config file: ${errors}`);

		process.exit(1);
	}

	// load the package.json
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const OS = (env.OS ?? process.platform) as NodeJS.Platform;
	console.log(`Reading '${config.package_json ?? "package.json"}'`);
	const package_json = JSON.parse(
		await fs.readFile(config.package_json ?? "package.json", "utf-8")
	) as { version: string; dependencies: Record<string, string>; name: string };
	const build_name = `${package_json.name}_${package_json.version}_${OS}`;

	config.license_report.config.output ??= "build/3rdpartylicenses.json";
	const build_dir = path.join(config.release_dir, "build");
	const release_dir = path.join(config.release_dir, build_name);

	// helper-functions
	/**
	 * check wether a file exists
	 * @param src path to check
	 * @returns exists
	 */
	async function fs_exists(src: string): Promise<boolean> {
		try {
			await fs.stat(src);
			return true;
		} catch {
			return false;
		}
	}
	/**
	 * ensure the parent-directories of the file exist
	 * @param pth path of the file
	 */
	async function create_parent_dirs(pth: string) {
		const parent_dir = path.parse(path.resolve(pth)).dir;
		if (!(await fs_exists(parent_dir))) {
			await fs.mkdir(parent_dir, { recursive: true });
		}
	}

	// helper-functions
	/**
	 * copy a file into the build-directory
	 * @param file path to the file
	 * @param dest destination relative to the build-directory
	 */
	async function copy_build_file(file: string, dest?: string) {
		dest = path.join(build_dir, dest ?? file);

		await create_parent_dirs(dest);

		await fs.copyFile(await fs.realpath(file), dest);
	}

	/**
	 * copy a directory into the build-directory
	 * @param dir path to the file
	 * @param dest destination relative to the build-directory
	 * @param args optional. arguments for fs.cpSync
	 */
	async function copy_build_dir(dir: string, dest?: string, args?: CopyOptions) {
		dest = path.join(build_dir, dest ?? dir);

		await create_parent_dirs(dest);

		await fs.cp(dir, dest, { recursive: true, ...args });
	}

	/**
	 * copy a file into the release-directory
	 * @param file path to the file
	 * @param dest destination relative to the release-directory
	 */
	async function copy_release_file(file: string, dest?: string) {
		dest = path.join(release_dir, dest ?? file);

		await create_parent_dirs(dest);

		await fs.copyFile(await fs.realpath(file), dest);
	}

	/**
	 * copy a directory into the release-directory
	 * @param dir path to the file
	 * @param dest destination relative to the release-directory
	 * @param args optional. arguments for fs.cpSync
	 */
	async function copy_release_dir(dir: string, dest?: string, args?: CopyOptions) {
		dest = path.join(release_dir, dest ?? dir);

		await create_parent_dirs(dest);

		await fs.cp(await fs.realpath(dir), dest, { recursive: true, ...args });
	}

	/**
	 * (try to) delete a directory and create it again
	 * @param pth path of the directory
	 */
	async function recreate_directory(pth: string) {
		console.log(`\t'${pth}'`);

		if (await fs_exists(pth)) {
			await fs.rm(pth, { recursive: true, force: true });
		}

		await fs.mkdir(pth, { recursive: true });
	}

	/**
	 * create a bash / cmd launch-script for a node-program
	 * @param pth_js path of the programm in the build-directory
	 * @param name name for the created file
	 * @param pth_script optional. path of the script
	 */
	async function create_launch_script(pth_js: string, name: string, pth_script?: string) {
		const path_parse_pth_js = path.parse(pth_js);
		pth_script ??= path.join(path_parse_pth_js.dir, path_parse_pth_js.name);

		if (pth_script !== undefined) {
			// create the path from the script to the js-file
			const script_pth_elements = pth_script.split(/\//);
			const js_pth_elements = pth_js.split(/\//);

			while (script_pth_elements[0] === js_pth_elements[0]) {
				script_pth_elements.shift();
				js_pth_elements.shift();
			}

			pth_js = "../".repeat(script_pth_elements.length - 1) + js_pth_elements.join("/");
		} else {
			pth_js = path.basename(pth_js);
		}

		let extension: string = "";
		let content: string = "";
		const relative_path_prefix = "../".repeat((pth_script.match(/\//g) ?? []).length);

		switch (OS) {
			case "win32":
				extension = ".bat";

				content = `@echo off\ncd /D "%~dp0"\n${relative_path_prefix.replaceAll("/", "\\")}${exec_name} ${pth_js}\npause\n`;

				break;
			case "linux":
				extension = ".sh";

				content = `${relative_path_prefix}./${exec_name} ${pth_js}\nread -n1 -r -p "Press any key to continue..." key`;

				break;
		}

		pth_script += extension;

		console.log(`\t${name}: '${pth_script}' for '${pth_js}'`);

		pth_script = path.join(release_dir, pth_script);

		await create_parent_dirs(pth_script);

		await fs.writeFile(pth_script, content, { mode: "766" });
	}

	type DownloadedFiles = Record<string, Uint8Array>;
	async function get_file(f: DownloadFileDefinition): Promise<DownloadedFiles> {
		switch (f.type) {
			case "tar.xz":
				return get_xz_file(f);
			case "zip":
				return get_zip_file(f);
		}
	}

	/**
	 * download a zip-file and extract all or some of its content
	 * @param src link to the zip file
	 * @param files optional list of files to extract
	 * @returns dict of path -> data
	 */
	async function get_zip_file(def: DownloadFileDefinition): Promise<DownloadedFiles> {
		const zip_buffer = await fetch(def.src).then((res) => res.arrayBuffer());
		const zip = new Uint8Array(zip_buffer);

		return unzipSync(zip, {
			filter: def.files ? (zf) => def.files.some((f) => zf.name === f.src) : undefined
		});
	}

	async function get_xz_file(def: DownloadFileDefinition): Promise<DownloadedFiles> {
		const res = await fetch(def.src);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const output: Record<string, Uint8Array> = {};

		const extract = tar.extract();

		extract.on("entry", (header, stream, next: () => void) => {
			const name = header.name;

			if (!def.files || def.files.some((f) => f.src === name)) {
				const chunks: Buffer[] = [];
				stream.on("data", (c: Buffer) => chunks.push(c));
				stream.on("end", () => {
					output[name] = new Uint8Array(Buffer.concat(chunks));
					next();
				});
			} else {
				stream.resume();
				stream.on("end", next);
			}
		});

		if (res.body) {
			const xz = new XzReadableStream(res.body);

			await pipeline(xz, extract);
		}

		return output;
	}

	/* eslint-enable @typescript-eslint/no-unused-vars */

	const exec_map: Partial<Record<NodeJS.Platform, { file: string; path?: string }>> = {
		win32: { file: "node.exe" },
		linux: { file: "node", path: "bin" }
	};

	let exec_name: string;
	// check, wether the build script supports the os
	if (!(OS in exec_map)) {
		console.error("Buildscript does not support this OS");
		process.exit(1);
	} else {
		exec_name = exec_map[OS]!.file;
	}

	console.log(
		`Building '${package_json.name}' version '${package_json.version}' for target '${OS}'`
	);
	console.log();

	console.log(`Build directory is '${build_dir}'`);
	console.log(`Release directories are '${release_dir}'`);
	console.log();

	// clear the build- and release-directories
	console.log("recreating directories");
	await recreate_directory(build_dir);
	await recreate_directory(release_dir);
	console.log();

	// bundle the different scripts
	console.log("Running build-scripts");
	Object.entries(config.builds).forEach(([name, build]) => {
		console.log(`\t${name}`);
		execSync(`pnpm run ${build.script}`);
	});
	console.log();

	// generate config-files from schemas
	if (config.configs !== undefined) {
		console.log("Copying config-files");

		await Promise.all(
			Object.entries(config.configs).map(async ([name, conf]) => {
				console.log(
					`\t${name}: from '${conf.orig}' to '${conf.dest}' validated by '${conf.schema}'`
				);

				let file_format_library;

				switch (path.extname(conf.dest ?? conf.orig)) {
					case ".yaml":
					case ".yml":
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						file_format_library = (s: string) => yaml.parse(s);
						break;
					case ".json":
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						file_format_library = (s: string) => JSON.parse(s);
						break;
				}

				if (file_format_library !== undefined) {
					const validator = ajv.compile(JSON.parse(await fs.readFile(conf.schema, "utf-8")));

					if (!validator(file_format_library(await fs.readFile(conf.orig, "utf-8")))) {
						const errors =
							validator.errors?.map((error) => `${error.instancePath}: ${error.message}`) ?? [];

						throw new SyntaxError(`invalid config file: ${errors.join(", ")}`);
					}

					if (conf.dest !== undefined) {
						await create_parent_dirs(conf.dest);
					}

					await copy_release_file(conf.orig, conf.dest);
				} else {
					throw new SyntaxError(
						`config-file extension '${path.extname(conf.dest ?? conf.orig)}' is not supported`
					);
				}
			})
		);
		console.log();
	}

	// create script-files, that start node with the entry-point
	type ObjectEntries<T extends object> = [keyof T, T[keyof T]][];
	type ConfigBuildsWithEntry = ObjectEntries<
		Record<string, Config["builds"][number] & Required<Pick<Config["builds"][number], "entry">>>
	>;
	const startup_script_builds = Object.entries(config.builds).filter(
		([, build]) => !!build.entry
	) as ConfigBuildsWithEntry;

	if (startup_script_builds.length > 0) {
		console.log(`Creating startup-scripts`);

		await Promise.all(
			startup_script_builds.map(async ([name, build]) =>
				create_launch_script(build.entry, name, build.script_path)
			)
		);
		console.log();
	}

	// create and copy the licenses
	console.log("Aggregate licenses");

	const license_reporter_config_ts = `import { IReporterConfiguration } from "@weichwarenprojekt/license-reporter";export const configuration: Partial<IReporterConfiguration>=${JSON.stringify(config.license_report.config)}`;
	const license_reporter_config_ts_file = tmp.fileSync({ postfix: ".ts" });

	await fs.writeFile(license_reporter_config_ts_file.name, license_reporter_config_ts);

	try {
		execSync(`npx license-reporter --config ${license_reporter_config_ts_file.name}`, {
			stdio: "ignore"
		});
	} catch {
		/* empty */
	}

	license_reporter_config_ts_file.removeCallback();

	interface License {
		name: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		licenseText: string;
	}

	console.log("\tLoading licence-report");
	const licenses_orig = JSON.parse(
		await fs.readFile(config.license_report.config.output, "utf-8")
	) as License[];

	const licenses: Record<string, License> = {};

	licenses_orig.forEach((pack) => {
		licenses[pack.name] = pack;
	});

	console.log("\tCreating licence-directory");
	await fs.mkdir(path.join(release_dir, config.license_report.path), { recursive: true });

	console.log("\tWriting licences");
	await Promise.all(
		Object.keys(package_json.dependencies).map(async (pack) => {
			const lic = licenses[pack];

			console.log(`\t\t'${lic.name}'`);

			try {
				await fs.writeFile(
					path.join(release_dir, config.license_report.path, `${lic.name}.txt`),
					lic.licenseText,
					"utf-8"
				);
			} catch {
				if (lic.licenseText === undefined) {
					throw new EvalError(`ERROR: no license was found for the package '${lic.name}'`);
				}
			}
		})
	);

	console.log(`\tWriting ${package_json.name}-licene`);
	await copy_release_file(
		config.license_report.license.path,
		config.license_report.license.destination
	);

	console.log();
	console.log(`Copying files to '${release_dir}'`);

	await Promise.all(
		Object.entries(config.builds).map(async ([name, build]) =>
			Promise.all(
				build.files.map(async (file) => {
					const file_path = path.join(build_dir, file);

					console.log(`\t${name}: '${file_path}'`);

					if ((await fs.stat(file_path)).isFile()) {
						await copy_release_file(file_path, file);
					} else {
						await copy_release_dir(file_path, file);
					}
				})
			)
		)
	);

	// copy additional directories
	await Promise.all(
		config.copy?.map(async ({ orig, dest, os }) => {
			// if a os is specified, copy only, if it fits the platform
			if (os === undefined || OS === os) {
				if (dest !== undefined) {
					const dest_parent = path.parse(path.join(release_dir, dest)).dir;

					// if the destinations-parent doesn't exist, create it
					if (!(await fs_exists(dest_parent))) {
						await fs.mkdir(dest_parent, { recursive: true });
					}

					console.log(`\t'${orig}' -> '${dest}'`);
				} else {
					console.log(`\t'${orig}'`);
				}

				// handle files and directories different
				if ((await fs.stat(orig)).isDirectory()) {
					await copy_release_dir(orig, dest ?? orig);
				} else {
					await copy_release_file(orig, dest ?? orig);
				}
			}
		}) ?? []
	);

	console.log();

	// download files
	console.log("downloading files");

	// external packages
	if (config.external_packages !== undefined) {
		console.log("\texternal node-modules");
		config.external_packages.forEach((module) => console.log(`\t\t'${module}'`));

		execSync(
			`npm install --os=${OS} --no-save --prefix ${release_dir} ${config.external_packages.join(" ")}`,
			{ stdio: "ignore" }
		);
	}

	// get the node executable
	if (startup_script_builds.length > 0) {
		console.log(`\tnode executable: "${exec_name}"`);

		const platform_overwrite_map: Record<string, string> = {
			win32: "win"
		};

		const platform_extension_map: Record<string, string> = {
			win32: "zip",
			linux: "tar.xz"
		};

		const file_name = `node-v${config.node_version}-${platform_overwrite_map[OS] ?? OS}-x64`;

		const exec_path = [file_name, exec_map[OS]?.path, exec_name].filter((p) => p).join("/");

		const download_definition: DownloadFileDefinition = {
			type: platform_extension_map[OS] as DownloadFileDefinition["type"],
			src: `https://nodejs.org/dist/v${config.node_version}/${file_name}.${platform_extension_map[OS]}`,
			files: [
				{
					src: exec_path,
					dest: exec_name
				}
			]
		};

		const node_file = get_file(download_definition);

		await fs.writeFile(path.join(release_dir, exec_name), (await node_file)[exec_path]);
	}

	if (config.download_files) {
		const downloads = config.download_files.filter((d) => d.os === undefined || d.os === OS);

		if (downloads.length > 0) {
			await Promise.all(
				downloads.map(async (d) => {
					console.log(`\t${d.src}`);

					const extracted_files = await get_file(d);

					await Promise.all(
						d.files.map(async (f) => {
							console.log(`\t\t${f.src} ${f.dest ? ` -> ${f.dest}` : ""}`);

							await fs.writeFile(path.join(release_dir, f.dest ?? f.src), extracted_files[f.src]);
						})
					);
				})
			);
		}
	}

	console.log();

	if (config.mkdir) {
		console.log("Creating empty directories");

		await Promise.all(
			config.mkdir.map(async (dir) => {
				console.log(`\t'${dir}'`);

				await fs.mkdir(path.join(release_dir, dir), { recursive: true });
			})
		);

		console.log();
	}
	// pack the files
	console.log(`Packing release to '${release_dir}.zip'`);
	const zip_stream = createWriteStream(release_dir + ".zip");

	const archive = archiver("zip");

	archive.pipe(zip_stream);

	archive.directory(release_dir, false);

	void archive.finalize();

	if (!config.keep) {
		console.log();

		console.log("Removing build files");

		console.log(`\t${build_dir}`);
		await fs.rm(build_dir, { recursive: true, force: true });

		console.log(`\t${config.license_report.config.output}`);
		await fs.rm(config.license_report.config.output);
	}
})();
