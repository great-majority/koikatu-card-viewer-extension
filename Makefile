.PHONY: all clean install build build-content build-background build-options copy-assets lint lint-fix format

all: build

install:
	npm install

build: clean build-content build-background build-options copy-assets

build-content:
	npx vite build --config vite.config.content.ts

build-background:
	npx vite build --config vite.config.background.ts

build-options:
	npx vite build --config vite.config.ts

copy-assets:
	cp manifest.json dist/
	cp -r public/icons dist/

lint:
	npx biome check src/

lint-fix:
	npx biome check --write src/

format:
	npx biome format --write src/

clean:
	rm -rf dist
