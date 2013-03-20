dist: components index.js
	@component build --standalone lruList --name codeactual-lru-list

build: components index.js
	@component install --dev
	@component build --standalone lruList --name build --dev

components: component.json
	@component install --dev

clean:
	rm -fr build

.PHONY: clean
