import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ command }) => ({
	plugins: [vue()],
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "main.html")
			}
		},
		outDir: "../../dist/build/client",
		emptyOutDir: true
	},
	publicDir: command === "build" ? false : "../../casparcg-templates",
	root: "src/client",
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url))
		}
	}
}));
