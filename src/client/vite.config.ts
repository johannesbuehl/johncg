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
		emptyOutDir: true,
		chunkSizeWarningLimit: 2000
	},
	publicDir: command === "build" ? false : "../../casparcg",
	root: "src/client",
	resolve: {
		alias: [
			{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
			{ find: "@server", replacement: fileURLToPath(new URL("../server", import.meta.url)) }
		]
	}
}));
