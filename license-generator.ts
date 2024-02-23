import fs from "fs";

const packag = JSON.parse(fs.readFileSync("package.json", "utf-8"));

const licenses_orig = JSON.parse(fs.readFileSync("dist/build/3rdpartylicenses.json", "utf-8"));

const licenses = {};

licenses_orig.forEach((pack) => {
	licenses[pack.name] = pack;
});

fs.mkdirSync("dist/build/licenses");

Object.keys(packag.dependencies).forEach((pack) => {
	const lic = licenses[pack];

	try {
		fs.writeFileSync(`dist/build/licenses/${lic.name}.txt`, lic.licenseText, "utf-8");
	} catch (e) {
		if (lic.licenseText === undefined) {
			throw new EvalError(`ERROR: no license was found for the package '${lic.name}'`);
		}
	}
});

fs.copyFileSync("LICENSE", "dist/build/licenses/JohnCG.txt");