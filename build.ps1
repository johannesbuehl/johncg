# bundle the files
yarn esbuild server/src/main.ts --bundle --platform=node --outfile=dist/main.js
# create sea-prep.blob
node --experimental-sea-config .\sea-config.json
# get the node executable
node -e "require('fs').copyFileSync(process.execPath, 'dist/JohnCG.exe')"
# remove the signature from the node executable
signtool remove /s dist/JohnCG.exe
# modify the node executable
yarn postject dist/JohnCG.exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# copy the additional files to the output
Copy-Item .\config.json .\casparcg-template .\client .\dist