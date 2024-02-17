# clear the dist directory
Remove-Item -Path .\Dist\* -Recurse
New-Item -Type Directory .\Dist\build
New-Item -Type Directory .\Dist\JohnCG

# bundle the files
yarn esbuild server/src/main.ts --bundle --platform=node --outfile=dist/build/main.js

# create sea-prep.blob
node --experimental-sea-config .\sea-config.json

# get the node executable
node -e "require('fs').copyFileSync(process.execPath, 'dist/build/JohnCG.exe')"

# remove the signature from the node executable
& 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe' remove /s dist/build/JohnCG.exe

# modify the node executable
yarn postject dist/build/JohnCG.exe NODE_SEA_BLOB dist/build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# copy the files in the output
Copy-Item -Path .\config.json,.\casparcg-template,.\client -Destination .\dist\JohnCG -Exclude .eslintrc -Recurse
Copy-Item -Path .\dist\build\JohnCG.exe .\dist\JohnCG -Recurse

# pack the files in a .tar.gz-file
tar -cvzf .\dist\JohnCG.tar.gz --directory=dist JohnCG