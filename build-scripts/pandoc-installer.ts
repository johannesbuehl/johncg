import tmp from "tmp";
import fs from "fs";
import path from "path";
import StreamZip from "node-stream-zip";
import child_process from "child_process";
import readline from "node:readline/promises";
import { stdin, stdout } from "process";

void (async () => {
	let license_message: string;
	
	if (process.platform === "win32") {
		license_message = "You are about to download eisvogel, pandoc and texlive, which licenses differ from the one of JohnCG. Their respetive licenses can be found at https://raw.githubusercontent.com/Wandmalfarbe/pandoc-latex-template/master/LICENSE, https://raw.githubusercontent.com/jgm/pandoc/main/COPYRIGHT and https://www.tug.org/texlive/LICENSE.TL . By proceeding you acknowledge those.";
	} else {
		license_message = "You are about to download eisvogel which license differs from the one of JohnCG. It can be found at https://raw.githubusercontent.com/Wandmalfarbe/pandoc-latex-template/master/LICENSE . By proceeding you acknowledge it.";
	}

	const rl = readline.createInterface({ input: stdin, output: stdout });

	const response = rl.question(license_message + " Proceed? (y/[n]) ");

	if ((await response).toLowerCase() !== "y") {
		process.exit(0);
	}

	const urls: Record<string, Record<string, string>> = {
		win32: {
			pandoc: "https://github.com/jgm/pandoc/releases/download/3.1.13/pandoc-3.1.13-windows-x86_64.zip",
			texlive: "https://de.mirrors.cicku.me/ctan/systems/texlive/tlnet/install-tl.zip",
			eisvogel: "https://github.com/Wandmalfarbe/pandoc-latex-template/releases/latest/download/Eisvogel.zip"
		},
		linux: {
			eisvogel: "https://github.com/Wandmalfarbe/pandoc-latex-template/releases/latest/download/Eisvogel.zip"
		}
	};

	if (!Object.keys(urls).includes(process.platform)) {
		return;
	}

	const download_dir = tmp.dirSync();

	// download the files
	await Promise.all(Object.values(urls[process.platform]).map(async (url) => {
		const response = await fetch(url);
		
		const data = await response.arrayBuffer();
		
		const zip_file = path.join(download_dir.name, path.basename(url));

		fs.writeFileSync(zip_file, Buffer.from(data));

		const zip = new StreamZip.async({ file: zip_file });
		const unpacked_files_dir = zip_file.match(/(.*)\.zip$/)[1];
		fs.mkdirSync(unpacked_files_dir);
		
		await zip.extract(null, unpacked_files_dir);
			
		await zip.close();
	}));

	fs.copyFileSync(path.join(download_dir.name, "Eisvogel", "eisvogel.latex"), "eisvogel.latex");

	if (process.platform === "win32") {
		fs.copyFileSync(path.join(download_dir.name, path.basename(urls.win32.pandoc).match(/(.*)\.zip$/)[1], "pandoc-3.1.13", "pandoc.exe"), "pandoc.exe");
	
		// get the path with its changed filename
		const dir = fs.readdirSync(path.join(download_dir.name, "install-tl")).filter((ele) => ele.match(/^install-tl-\d{8}$/))[0];

		child_process.execSync(`${path.join(download_dir.name, "install-tl", dir, "install-tl-windows.bat")} -portable -no-gui --profile texlive.profile`, { stdio: "inherit" });
	}

	fs.rmSync(download_dir.name, { recursive: true, force: true });
})();