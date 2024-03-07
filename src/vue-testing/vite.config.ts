import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
	],
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "main.html")
			}
		},
		outDir: "../../dist/build/client",
		emptyOutDir: true
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	publicDir: "../../casparcg-templates"
})
