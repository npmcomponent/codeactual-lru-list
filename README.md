# lru-list

Storage-agnostic LRU list w/ async value IO.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Single-Key Example

```js
var list = new LRUList();

list.set('limit', 50)
    .set('set', function(key, val, done) {
      // Write to storage ...
      done(/* or Error() */);
    })
    .set('get', function(key, done) {
      // Read from storage ...
      done(/* or Error() */, val);
    })
    .set('del', function(key, done) {
      // Write to storage ...
      done(/* or Error() */);
    });

list.put(key, val, function putDone(err) { /* ... */ });
list.shift(function shiftDone(err) { /* ... */ });
list.get(key, function getDone(err, val) { /* ... */ });
list.remove(key, function removeDone(err) { /* ... */ });
list.keys(); // ['key1', 'key2', ...]
```

## Multi-Key Example

```js
// Add optional multi-key handling.
list.set('setMulti', function(pairs, done) {
      // Write to storage ...
      done(/* or Error() */);
    })
    .set('getMulti', function(keys, done) {
      // Read from storage ...
      done(/* or Error() */, pairs);
    })
    .set('delMulti', function(keys, done) {
      // Write to storage ...
      done(/* or Error() */);
    });

list.putMulti(pairs, function putMultiDone(err) { /* ... */ });
list.getMulti(keys, function getMultiDone(err, pairs) { /* ... */ });
list.removeMulti(keys, function removeMultiDone(err) { /* ... */ });
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

Create a new `LRUList`.

Settings updatable via [configurable.js](https://github.com/visionmedia/configurable.js) `#set()` API:

`{number} limit` Maximum list entries.

* default: -1

`{function} set(key, val, done)` The callback responsible for writing a value at a given key.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null);`

`{function} setMulti(pairs, done)` The callback responsible for writing a set of key/value pairs.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null);`

`{function} get(key, done)` The callback responsible for reading a value at a given key.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null, val);`

`{function} getMulti(keys, done)` The callback responsible for reading values at given key set.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null, pairs);`

`{function} remove(key, done)` The callback responsible for removing key/value pair.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null);`

`{function} removeMulti(keys, done)` The callback responsible for removing a set of key/value pairs.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null);`

### #put(key, value, fn)

Append key to the list's tail. Trigger storage of the value.

`fn` receives `(<null|Error>)`.

### #putMulti(pairs, fn)

Append keys to the list's tail in object-key order. Trigger storage of the values.

`fn` receives `(<null|Error>)`.

### #shift(fn)

Remove the key at the list's head (the LRU). Trigger removal of the value.

`fn` receives `(<undefined|Error>)`.

### #get(key, fn)

Promote the key to the tail (MRU). Read the value from storage.

`fn` receives `(<undefined|Error>, <undefined|value>)`.

### #getMulti(keys, fn)

Promote the keys to the tail (MRU) in array order. Read the values from storage.

`fn` receives `(<undefined|Error>, <undefined|pairs>)`.

### #remove(key, fn)

Remove the key from the list and key map. Trigger removal of the value.

`fn` receives `(<undefined|Error>)`.

### #removeMulti(keys, fn)

Remove the keys from the list and key map, in array order. Trigger removal of the values.

`fn` receives `(<undefined|Error>)`.

### Array#keys()

Produce a head-to-tail ordered key list.

## License

  MIT

  Based on https://github.com/rsms/js-lru (MIT).

# Tests

```
npm install --devDependencies
npm test
```

# Change Log

## 1.1.0

* Replaced: LRUList() configuration object with [configurable.js](https://github.com/visionmedia/configurable.js/).
* Replaced: Default 100 entry limit with no limit.
* Added: `putMulti`,  `getMulti`, `removeMulti`.
* Fix: shift() did not wait for storage deletion success before updating list.

## 1.0.0

* Added: initial API and tests for `put`, `shift`, `get`, `remove`, `keys`.
