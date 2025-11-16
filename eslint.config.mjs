// @ts-check

import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import jsdoc from "eslint-plugin-jsdoc";
import eslint from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import vueParser from "vue-eslint-parser";
import vuePlugin from "eslint-plugin-vue";

export default defineConfig(
	{
		files: ["src/**/*.{ts}"]
	},
	{
		ignores: [
			"eslint.config.mjs",
			"casparcg",
			"src/version.ts",
			"dist",
			"out",
			"typst",
			"build/release.js"
		]
	},
	eslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,

	// general
	{
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".vue"]
			}
		}
	},
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,vue}"],
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
			],
			"@typescript-eslint/no-floating-promises": "error"
		}
	},
	{
		files: ["build/*.mjs"],
		rules: Object.fromEntries(
			Object.keys(tsPlugin.rules).map((ruleName) => [`@typescript-eslint/${ruleName}`, "off"])
		)
	},

	// vue
	{
		files: ["src/**/*.vue"],
		languageOptions: {
			// vue-eslint-parser handles the .vue structure
			parser: vueParser,
			globals: globals.browser,

			// This parserOptions.parser is the **nested TS parser**
			parserOptions: {
				parser: tsParser, // used for <script lang="ts">
				ecmaVersion: "latest",
				sourceType: "module"
			}
		},

		plugins: {
			vue: vuePlugin,
			// @ts-ignore
			"@typescript-eslint": tsPlugin
		},

		rules: {
			...vuePlugin.configs["vue3-essential"].rules,

			// Disable unsafe rules for Vue SFCs
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-argument": "off"
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
						ClassDeclaration: true
					}
				}
			]
		}
	}
);

// export default [
// 	{
// 		files: ["src/**/*.{js,mjs,cjs,ts,vue}"]
// 	},
// 	// {
// 	// 	files: ["**/*.mjs"],
// 	// 	languageOptions: {
// 	// 		parserOptions: {
// 	// 			projectService: false
// 	// 		}
// 	// 	}
// 	// },
// 	...pluginVue.configs["flat/essential"],

// 	// general
// 	{
// 		languageOptions: {
// 			globals: globals.node,
// 			parserOptions: {
// 				projectService: true,
// 				extraFileExtensions: [".vue"]
// 			}
// 		},
// 		...tseslint.configs.recommendedTypeChecked,
// 		rules: {
// 			"@typescript-eslint/naming-convention": [
// 				"error",
// 				{
// 					selector: "default",
// 					format: ["snake_case"]
// 				},
// 				{
// 					selector: "typeLike",
// 					format: ["PascalCase"],
// 					leadingUnderscore: "forbid",
// 					trailingUnderscore: "forbid"
// 				},
// 				{
// 					selector: "enumMember",
// 					format: ["PascalCase"],
// 					leadingUnderscore: "forbid",
// 					trailingUnderscore: "forbid"
// 				},
// 				{
// 					selector: "import",
// 					format: ["PascalCase", "snake_case", "camelCase"],
// 					leadingUnderscore: "forbid",
// 					trailingUnderscore: "forbid"
// 				},
// 				{
// 					selector: "default",
// 					modifiers: ["unused"],
// 					format: ["PascalCase", "snake_case", "camelCase"],
// 					leadingUnderscore: "allow",
// 					trailingUnderscore: "allow"
// 				}
// 			],
// 			"@typescript-eslint/no-unused-vars": [
// 				"error",
// 				{
// 					varsIgnorePattern: "^_",
// 					argsIgnorePattern: "^_",
// 					caughtErrorsIgnorePattern: "^_"
// 				}
// 			],
// 			"@typescript-eslint/no-floating-promises": "error"
// 		}
// 	},

// 	// vue
// 	{
// 		files: ["src/**/*.vue"],
// 		languageOptions: {
// 			globals: globals.browser,
// 			parserOptions: {
// 				parser: tseslint.parser
// 			}
// 		}
// 		// rules: {
// 		// 	"@typescript-eslint/no-unsafe-assignment": "off",
// 		// 	"@typescript-eslint/no-unsafe-call": "off",
// 		// 	"@typescript-eslint/no-unsafe-member-access": "off",
// 		// 	"@typescript-eslint/no-unsafe-argument": "off",
// 		// 	"@typescript-eslint/no-unsafe-return": "off"
// 		// }
// 	},
// 	{
// 		rules: {
// 			"vue/no-use-v-if-with-v-for": "off"
// 			// "vue/script-indent": [
// 			// 	"error",
// 			// 	"tab",
// 			// 	{
// 			// 		"baseIndent": 1
// 			// 	}
// 			// ],
// 		}
// 	},

// 	//jsdoc
// 	{
// 		plugins: {
// 			jsdoc
// 		},
// 		rules: {
// 			"jsdoc/require-jsdoc": [
// 				"warn",
// 				{
// 					require: {
// 						MethodDefinition: true,
// 						ClassDeclaration: true
// 					}
// 				}
// 			]
// 		}
// 	},
// 	{
// 		ignores: [
// 			"eslint.config.mjs",
// 			"casparcg",
// 			"src/version.ts",
// 			"dist",
// 			"out",
// 			"typst",
// 			"build/release.js"
// 		]
// 	}
// ];
