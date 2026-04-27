lint:
	npx eslint .

dev-templates:
	npx vite -c src/templates/vite.config.ts

build-templates: typecheck-templates && build-templates-nocheck

typecheck-templates:
	npx vue-tsc --noEmit -p src/templates/tsconfig.json

build-templates-nocheck:
	npx vite -c src/templates/vite.config.ts build
