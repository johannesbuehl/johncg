# extract the buildname from the package.json
$package_json = Get-Content -Raw package.json | ConvertFrom-Json
$build_name = "JohnCG_" + $package_json.version

# clear the dist directory
Remove-Item -Path .\Dist\* -Recurse
New-Item -Type Directory .\Dist\build
New-Item -Type Directory .\Dist\$build_name

# bundle the files
yarn esbuild server/src/main.ts --bundle --platform=node --outfile=dist/build/main.js

# create sea-prep.blob
node --experimental-sea-config .\sea-config.json

# get the node executable
node -e "require('fs').copyFileSync(process.execPath, 'dist/build/$build_name.exe')"

# remove the signature from the node executable
& 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe' remove /s dist/build/$build_name.exe

# modify the node executable
yarn postject dist/build/$build_name.exe NODE_SEA_BLOB dist/build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# copy the files in the output
Copy-Item -Path .\config.json,.\casparcg-template,.\client -Destination .\dist\$build_name -Exclude .eslintrc -Recurse
Copy-Item -Path .\dist\build\$build_name.exe .\dist\$build_name -Recurse

# pack the files in a .tar.gz-file
tar -cvzf .\dist\$build_name.tar.gz --directory=dist $build_name