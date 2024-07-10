/* eslint-disable @typescript-eslint/naming-convention */
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(() => ({
	plugins: [vue()],
	base: "",
	build: {
		rollupOptions: {
			input: {
				Song: path.resolve(__dirname, "Song.html")
			}
		},
		outDir: "../../casparcg/Templates/JohnCG",
		emptyOutDir: true,
		// assetsDir: "."
		// chunkSizeWarningLimit: 2000
		minify: false
		// sourcemap: true
	},
	server: {
		host: true,
		port: 5174
	},

	root: "src/templates",
	resolve: {
		alias: [
			{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
			{ find: "@server", replacement: fileURLToPath(new URL("../server", import.meta.url)) }
		]
	}
}));
