# lru-list

Storage-agnostic LRU list w/ async value IO.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Example

```js
var list = new LRUList({
  limit: 50,
  set: function(key, val, done) {
    storage[key] = val;
    done(null);
  },
  get: function(key, done) {
    done(null, storage[key]);
  },
  del: function(key, done) {
    delete storage[key];
    done(null);
  }
});

list.put(key, val, function putDone(err) {
  // ...
});
list.shift(function shiftDone(err) {
  // ...
});
list.get(key, function getDone(err, val) {
  // ...
});
list.remove(key, function removeDone(err) {
  // ...
});
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

### Async methods

### #put(str, value, fn)

Append key to the list's tail. Trigger storage of the value.

`fn` receives `(<null|Error>)`.

### #shift(fn)

Remove the key at the list's head (the LRU). Trigger removal of the value.

`fn` receives `(<null|Error>)`.

### #get(str, fn)

Promote the key to the tail (MRU). Read the value from storage.

`fn` receives `(<null|Error>, <undefined|value>)`.

### #remove(str, fn)

Remove the key from the list and key map. Trigger removal of the value.

`fn` receives `(<null|Error>)`.

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

## 1.0.0

* Added initial API and tests for: `put`, `shift`, `get`, `remove`, `keys`.
