# lru-list

Storage-agnostic LRU list with async/multi-key operations.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Single-Key Example

```js
var list = new LRUList();

list.setOption('limit', 50)
    .setOption('set', function(key, val, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    })
    .setOption('get', function(key, cb) {
      // Read from storage ...
      cb(/* or Error() */, val);
    })
    .setOption('del', function(key, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    });

list.set(key, val, function setDone(err) { /* ... */ });
list.shift(function shiftDone(err) { /* ... */ });
list.get(key, function getDone(err, val) { /* ... */ });
list.del(key, function delDone(err) { /* ... */ });
list.keys(); // ['key1', 'key2', ...]
```

## Multi-Key Example

```js
// Add optional multi-key handling.
list.setOption('setMulti', function(pairs, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    })
    .setOption('getMulti', function(keys, cb) {
      // Read from storage ...
      cb(/* or Error() */, pairs);
    })
    .setOption('delMulti', function(keys, cb) {
      // Write to storage ...
      cb(/* or Error() */);
    });

list.setMulti(pairs, function setMultiDone(err) { /* ... */ });
list.getMulti(keys, function getMultiDone(err, pairs) { /* ... */ });
list.delMulti(keys, function delMultiDone(err) { /* ... */ });
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

`{function} set(key, val, cb)` The callback responsible for writing a value at a given key.

* Required: No. Implement `#set` and/or `#setMulti` as needed.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

`{function} setMulti(pairs, cb)` The callback responsible for writing a set of key/value pairs.

* Required: No. Implement `#set` and/or `#setMulti` as needed.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

`{function} get(key, cb)` The callback responsible for reading a value at a given key.

* Required: No. Implement `#get` and/or `#getMulti` as needed.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null, val);`

`{function} getMulti(keys, cb)` The callback responsible for reading values at given key set.

* Required: No. Implement `#get` and/or `#getMulti` as needed.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null, pairs);`

`{function} del(key, cb)` The callback responsible for removing key/value pair.

* Required: Yes.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

`{function} delMulti(keys, cb)` The callback responsible for removing a set of key/value pairs.

* Required: No.
* To indicate an error: `cb(new Error('reason'));`
* To indicate an success: `cb(null);`

### #set(key, value, cb)

> Append key to the list's tail. Trigger storage of the value.

`cb` receives `(<null|Error>)`.

### #setMulti(pairs, cb)

> Append keys to the list's tail in object-key order. Trigger storage of the values.

`cb` receives `(<null|Error>)`.

### #shift(cb)

> Remove the key at the list's head (the LRU). Trigger removal of the value.

`cb` receives `(<null|Error>)`.

### #get(key, cb)

> Promote the key to the tail (MRU). Read the value from storage.

`cb` receives `(<null|Error>, <undefined|value>)`.

### #getMulti(keys, cb)

> Promote the keys to the tail (MRU) in array order. Read the values from storage.

`cb` receives `(<null|Error>, <undefined|pairs>)`.

### #del(key, cb)

> Remove the key from the list and key map. Trigger removal of the value.

`cb` receives `(<null|Error>)`.

### #delMulti(keys, cb)

> Remove the keys from the list and key map, in array order. Trigger removal of the values.

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

### NPM

    npm install --devDependencies
    npm test

## Change Log

### 1.1.0

* Rename: `put*` to `set*`, `remove*` to `del*`.
* Replaced: LRUList() configuration object with [configurable.js](https://github.com/visionmedia/configurable.js/).
* Replaced: Default 100 entry limit with no limit.
* Added: `setMulti`,  `getMulti`, `delMulti`, `has`, `delAll`.
* Added: Serialization of list to the storage backend and keymap regeneration via `saveStruct` and `restoreStruct`.
* Fix: shift() did not wait for storage deletion success before updating list.

### 1.0.0

* Added: initial API and tests for `set`, `shift`, `get`, `del`, `keys`.
