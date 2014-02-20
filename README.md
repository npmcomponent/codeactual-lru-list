*This repository is a mirror of the [component](http://component.io) module [codeactual/lru-list](http://github.com/codeactual/lru-list). It has been modified to work with NPM+Browserify. You can install it using the command `npm install npmcomponent/codeactual-lru-list`. Please do not open issues or send pull requests against this repo. If you have issues with this repo, report it to [npmcomponent](https://github.com/airportyh/npmcomponent).*
# lru-list

Storage-agnostic LRU list with async/multi-key operations.

[![Build Status](https://travis-ci.org/codeactual/lru-list.png)](https://travis-ci.org/codeactual/lru-list)

## Example

```js
var list = require('lru-list').create()

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

See [bindle](https://github.com/codeactual/bindle) for an example of using `lru-list` to handle `QUOTA_EXCEEDED_ERR` errors from `localStorage`.

## Installation

### [NPM](https://npmjs.org/package/lru-list)

    npm install lru-list

### [component](https://github.com/component/component)

    component install codeactual/lru-list

## API

[Documentation](docs/lru-list.md)

## License

  MIT

  Based on [js-lru](https://github.com/rsms/js-lru) (MIT).

## Tests

### Node

    npm test

### Browser via [Karma](http://karma-runner.github.com/)

* `npm install karma`
* `karma start`
* Browse `http://localhost:9876/`
* `make build && karma run`
