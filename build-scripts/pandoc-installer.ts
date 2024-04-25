import tmp from "tmp";
import fs from "fs";
import path from "path";
import StreamZip from "node-stream-zip";
import child_process from "child_process";

void (async () => {
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
	
		child_process.execSync(`${path.join(download_dir.name, "install-tl", "install-tl-20240423", "install-tl-windows.bat")} -portable -no-gui --profile texlive.profile`, { stdio: "inherit" });
	}

	fs.rmSync(download_dir.name, { recursive: true, force: true });
})();