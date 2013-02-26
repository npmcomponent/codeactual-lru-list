dist: components index.js
	@component build --standalone codeactual-lru-list --name codeactual-lru-list

build: components index.js
	@component build --dev

components: component.json
	@component install --dev

clean:
	rm -fr build

.PHONY: clean
