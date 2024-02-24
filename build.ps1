# extract the buildname from the package.json
$package_json = Get-Content -Raw package.json | ConvertFrom-Json
$build_name = "JohnCG_" + $package_json.version

# name of the executabe
$node_exec_name = $build_name + ".exe"
$node_exec_name = "node.exe" # overwritten until there is a solution for packaging `sharp`

# clear the dist directory
Remove-Item -Path .\dist -Recurse
New-Item -Type Directory .\dist\build
New-Item -Type Directory .\dist\$build_name

# bundle the files
npm run build-server
npm run build-client
npm run build-templates

# create sea-prep.blob
# node --experimental-sea-config .\sea-config.json

# get the node executable
node -e "require('fs').copyFileSync(process.execPath, 'dist/build/$node_exec_name')"

# disabled until there is a solution for packaging `sharp`
# # remove the signature from the node executable
# & 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe' remove /s dist/build/$node_exec_name
# # modify the node executable
# npx postject dist/build/$node_exec_name NODE_SEA_BLOB dist/build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# copy the files in the output
Copy-Item -Path .\config.json -Destination .\dist\$build_name -Exclude .eslintrc
Copy-Item -Path .\casparcg-templates -Destination .\dist\$build_name -Exclude .eslintrc,*.map -Recurse
Copy-Item -Path .\client -Destination .\dist\$build_name -Exclude .eslintrc,*.map,bahnschrift.ttf -Recurse
Copy-Item -Path .\dist\build\$node_exec_name .\dist\$build_name -Recurse

Copy-Item -Path .\node_modules\@img -Destination .\dist\$build_name\node_modules\@img\ -Recurse
Copy-Item -Path .\dist\build\main.js -Destination .\dist\$build_name\main.js

# create a batch file, that starts node with the main.js
New-Item -Path .\dist\$build_name\$build_name.bat -Value "node.exe main.js`npause"

# create and copy the licenses
npx esbuild license-generator.ts --platform=node --bundle --minify --outfile=.\dist\build\license-generator.js
npx license-reporter
node .\dist\build\license-generator.js

Copy-Item -Path .\dist\build\licenses -Destination .\dist\$build_name\ -Recurse
# Copy-Item -Path .\LICENSE -Destination .\dist\$build_name\LICENSE

# pack the files in a .tar.gz-file
tar -cvzf .\dist\$build_name.tar.gz --directory=dist $build_name