const fs = require('fs');
const path = require('path');

const DEV_CONFIG = "config.yaml";
const REPO_CONFIG = "config_default.yaml"
const TEMP_FILE = "config_temp.yaml"

function swapFiles(file1, file2, tempFile) {
	try {
		if (fs.existsSync(file1) && fs.existsSync(file2)) {
			console.log('Swapping config files...');
			
			// Rename to a temporary file
			fs.renameSync(file1, tempFile);
			
			// Rename file2 to file1
			fs.renameSync(file2, file1);
			
			// Rename the temp file to file2
			fs.renameSync(tempFile, file2);

			console.log('Swap completed successfully.');
		} else {
			console.error('One of the config files is missing.');
			process.exit(1);
		}
	} catch (error) {
		console.error('An error occurred while swapping files:', error);
		process.exit(1);
	}
}

swapFiles(DEV_CONFIG, REPO_CONFIG, TEMP_FILE);