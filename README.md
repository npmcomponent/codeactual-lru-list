# lru-list

Storage-agnostic LRU list w/ async value IO.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Example

```js
var list = new LRUList({
  limit: 50,
  set: function(key, val, done) {
    // Write to storage ...
    done(/* or Error() */);
  },
  setMulti: function(pairs, done) {
    // Write to storage ...
    done(/* or Error() */);
  },
  get: function(key, done) {
    // Read from storage ...
    done(/* or Error() */, val);
  },
  getMulti: function(keys, done) {
    // Read from storage ...
    done(/* or Error() */, pairs);
  },
  del: function(key, done) {
    // Write to storage ...
    done(/* or Error() */);
  },
  delMulti: function(keys, done) {
    // Write to storage ...
    done(/* or Error() */);
  }
});

list.put(key, val, function putDone(err) { /* ... */ });
list.putMulti(pairs, function putMultiDone(err) { /* ... */ });
list.shift(function shiftDone(err) { /* ... */ });
list.get(key, function getDone(err, val) { /* ... */ });
list.getMulti(keys, function getMultiDone(err, val) { /* ... */ });
list.remove(key, function removeDone(err) { /* ... */ });
list.removeMulti(keys, function removeMultiDone(err) { /* ... */ });
list.keys(); // ['key1', 'key2', ...]
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

### LRUList(config)

Create a new `LRUList` based on `config` fields:

`{number} limit` Maximum list entries.

* default: 100

`{function} set(key, val, done)` The callback responsible for writing a value at a given key.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null);`

`{function} get(key, done)` The callback responsible for reading a value at a given key.

* To indicate an error: `done(new Error('reason'));`
* To indicate an success: `done(null, val);`

`{function} remove(key, done)` The callback responsible for removing key/value pair.

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

* Added: `putMulti`,  `getMulti`, `removeMulti`.
* Fix: shift() did not wait for storage deletion success before updating list.

## 1.0.0

* Added: initial API and tests for `put`, `shift`, `get`, `remove`, `keys`.
