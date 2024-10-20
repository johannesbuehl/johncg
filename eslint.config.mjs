import globals from "globals";
// import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import jsdoc from "eslint-plugin-jsdoc";


export default [
	{
		files: ["src/**/*.{js,mjs,cjs,ts,vue}"]
	},
	// pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	...pluginVue.configs["flat/essential"],

	// general
	{
		languageOptions: {
			globals: globals.node
		},
		rules: {
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "default",
					format: ["snake_case"]
				},
				{
					selector: "typeLike",
					format: ["PascalCase"],
					leadingUnderscore: "forbid",
					trailingUnderscore: "forbid"
				},
				{
					selector: "enumMember",
					format: ["PascalCase"],
					leadingUnderscore: "forbid",
					trailingUnderscore: "forbid"
				},
				{
					selector: "import",
					format: ["PascalCase", "snake_case", "camelCase"],
					leadingUnderscore: "forbid",
					trailingUnderscore: "forbid"
				},
				{
					selector: "default",
					modifiers: ["unused"],
					format: ["PascalCase", "snake_case", "camelCase"],
					leadingUnderscore: "allow",
					trailingUnderscore: "allow"
				}
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			]
		}
	},

	// vue
	{
		files: ["src/**/*.vue"],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				parser: tseslint.parser
			}
		}
	},
	{
		rules: {
			"vue/no-use-v-if-with-v-for": "off",
			// "vue/script-indent": [
			// 	"error",
			// 	"tab",
			// 	{
			// 		"baseIndent": 1
			// 	}
			// ],
		}
	},

	//jsdoc
	{
		plugins: {
			jsdoc
		},
		rules: {
			"jsdoc/require-jsdoc": [
				"warn",
				{
					require: {
						MethodDefinition: true,
						ClassDeclaration: true,
					},
				},
			],
		}
	},
	{
		ignores: [
			"eslint.config.mjs",
			"casparcg",
			"src/version.ts",
			"dist",
			"out",
			"pandoc",
			"build/release.js",
			"docs"
		]
	},
];