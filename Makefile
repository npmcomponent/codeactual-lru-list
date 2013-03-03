dist: components index.js
	@component build --standalone lruList --name codeactual-lru-list

build: components index.js
	@component build --standalone lruList --name codeactual-lru-list --dev

components: component.json
	@component install --dev

clean:
	rm -fr build

.PHONY: clean
