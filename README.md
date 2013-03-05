# lru-list

Storage-agnostic LRU list with async/multi-key operations.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Exmaple

```js
var list = new LRUList();

list.setOption('limit', 50)
    .setOption('set', function(pairs, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    })
    .setOption('get', function(keys, cb) {
      // Read from storage ...
      cb(/* or Error() */, pairs);
    })
    .setOption('del', function(keys, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    });

list.set(key, val, function setDone(err) { /* ... */ });
list.set(pairs, function setDone(err) { /* ... */ });
list.shift(function shiftDone(err) { /* ... */ });
list.get(keys, function getDone(err, val) { /* ... */ });
list.del(keys, function delDone(err) { /* ... */ });
```

## Installation

### [Component](https://github.com/component/component)

Install to `components/`:

    $ component install codeactual/lru-list

Build standalone file in `build/`:

    $ make dist

### NPM

    $ npm install codeactual-lru-list

## API

### LRUList()

> Create a new `LRUList`.

[Configurable](https://github.com/visionmedia/configurable.js) via `#setOption()`:

`{number} limit` Maximum list entries.

* default: -1


`{function} set(pairs, cb)` The callback responsible for writing a set of key/value pairs.

* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

`{function} get(keys, cb)` The callback responsible for reading values at given key set.

* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null, pairs);`

`{function} del(keys, cb)` The callback responsible for removing a set of key/value pairs.

* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

### #set(key, value, cb)

> Append key to the list's tail. Trigger storage of the value.

`cb` receives `(<null|Error>)`.

### #set(pairs, cb)

> Append keys to the list's tail in object-key order. Trigger storage of the values.

`cb` receives `(<null|Error>)`.

### #shift(cb)

> Remove the key at the list's head (the LRU). Trigger removal of the value.

`cb` receives `(<null|Error>)`.

### #get(keys, cb)

> Promote the keys to the tail (MRU) in array order. Read the values from storage.

Provide `keys` as a string or array.

`cb` receives `(<null|Error>, <undefined|pairs>)`.

### #del(keys, cb)

> Remove the keys from the list and key map, in array order. Trigger removal of the values.

Provide `keys` as a string or array.

`cb` receives `(<null|Error>)`.

### #delAll(cb)

> Clear the list and key map. Trigger removal of all values.

`cb` receives `(<null|Error>)`.

### Array#keys()

> Produce a head-to-tail ordered key list.

### Boolean#has(key)

> Check if a key exists.

### #saveStruct(key, cb)

> Serialize the LRU list into the storage backend.

`cb` receives `(<null|Error>)`.

### #restoreStruct(key, cb)

> Unserialize the LRU list from the storage backend.

`cb` receives `(<null|Error>)`.

## License

  MIT

  Based on https://github.com/rsms/js-lru (MIT).

## Tests

### Node

    npm install --devDependencies
    npm test

### Browser via [Yeti](http://www.yeti.cx/)

* `npm install yeti`
* `yeti --server`
* Browse `http://localhost:9000`
* `make build && yeti test.html`

## Change Log

### 1.2.0

* Remove `setMulti/getMulti/delMulti` in favor of multi-key-only support through `set/get/del`. Storage handlers will always receive multi-key input types.

### 1.1.1

* Upgrade: `codeactual/is` to 0.1.3

### 1.1.0

* Rename: `put*` to `set*`, `remove*` to `del*`.
* Replaced: LRUList() configuration object with [configurable.js](https://github.com/visionmedia/configurable.js/).
* Replaced: Default 100 entry limit with no limit.
* Added: `setMulti`,  `getMulti`, `delMulti`, `has`, `delAll`.
* Added: Serialization of list to the storage backend and keymap regeneration via `saveStruct` and `restoreStruct`.
* Fix: shift() did not wait for storage deletion success before updating list.

### 1.0.0

* Added: initial API and tests for `set`, `shift`, `get`, `del`, `keys`.
