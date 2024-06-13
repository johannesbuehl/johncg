import { IReporterConfiguration } from "@weichwarenprojekt/license-reporter";

export const configuration: Partial<IReporterConfiguration> = {
	// defaultLicenseText: undefined,
    output: "build-scripts/3rdpartylicenses.json",
	ignore: ["dist/*"],
    overrides: [
		{
			name: "@esbuild/win32-x64"
		},
		{
			name: "binpack",
			licenseName: "BSL-1.0 (modified)"
		},
		{
			name: "eastasianwidth"
		},
		{
			name: "esrecurse"
		},
		{
			name: "imurmurhash"
		},
		{
			name: "keyv"
		},
		{
			name: "natural-compare"
		},
		{
			name: "undici-types"
		},
		{
			name: "canvas",
			licenseText: "(The MIT License)\n\nCopyright (c) 2010 LearnBoost, and contributors <dev@learnboost.com>\n\nCopyright (c) 2014 Automattic, Inc and contributors <dev@automattic.com>\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
		}
    ]
};