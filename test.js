var chai = require('chai');
var should = chai.should();
chai.Assertion.includeStack = true;

var lruList = require('./build/codeactual-lru-list');
var LRUList = lruList.LRUList;
var LRUEntry = lruList.LRUEntry;

var storeErr = new Error('store err');

describe('LRUList', function() {
  before(function(done) {
    this.key = 'foo';
    this.key2 = 'bob';
    this.val = 'bar';
    this.val2 = 'alice';
    this.oneKeyListEntry = {};
    this.oneKeyListEntry[this.key] = {
      key: this.key,
      older: undefined,
      newer: undefined
    };
    done();
  });

  describe('#LRUList()', function() {
    it('should init state', function(done) {
      var list = new LRUList();
      list.size.should.equal(0);
      list.limit.should.equal(100);
      list.store.set.should.be.instanceOf(Function);
      list.store.get.should.be.instanceOf(Function);
      list.store.del.should.be.instanceOf(Function);
      done();
    });

    it('should accept state', function(done) {
      var state = {
        limit: 5,
        set: emptyFn,
        get: emptyFn,
        del: emptyFn
      };
      var list = new LRUList(state);
      list.size.should.equal(0);
      list.limit.should.equal(state.limit);
      list.store.set.should.deep.equal(state.set);
      list.store.get.should.deep.equal(state.get);
      list.store.del.should.deep.equal(state.del);
      done();
    });
  });

  describe('#LRUEntry()', function() {
    it('should init state', function(done) {
      var key = 'foo';
      var entry = new LRUEntry(key);
      entry.key.should.equal(key);
      entry.should.have.ownProperty('older');
      should.not.exist(entry.older);
      entry.should.have.ownProperty('newer');
      should.not.exist(entry.newer);
      done();
    });
  });

  describe('#put()', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      function cb(err) {
        should.equal(err, null);
        done();
      }
      list.put(this.key, this.val, cb);
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      function cb(err) {
        should.equal(err, storeErr);
        done();
      }
      list.put(this.key, this.val, cb);
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.keymap.should.deep.equal(self.oneKeyListEntry);
        done();
      });
    });

    it('should not update key map on error', function(done) {
      var list = newListWithBrokenIO();
      list.put(this.key, this.val, function putDone() {
        list.keymap.should.deep.equal({});
        done();
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.storage[self.key].should.equal(self.val);
        done();
      });
    });

    it('should limit list', function(done) {
      var list = newList(3);
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['b', 'c', 'd'],
            ['c', 'd', 'e']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.put('d', this.val, addSnapshot);
      list.put('e', this.val, endSnapshots);
    });

    it('should let dupe keys push out older', function(done) {
      var list = newList(5);
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'b', 'c', 'a'],
            ['a', 'b', 'c', 'a', 'b'],
            ['b', 'c', 'a', 'b', 'c']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, endSnapshots);
    });

    it('should not update list on error', function(done) {
      var list = newListWithBrokenIO();
      list.put(this.key, this.val, function putDone() {
        should.not.exist(list.head);
        done();
      });
    });
  });

  describe('#putMulti()', function() {
    it('should propagate IO success', function(done) {
      done(); // TODO
    });

    it('should propagate IO error', function(done) {
      done(); // TODO
    });

    it('should update key map', function(done) {
      done(); // TODO
    });

    it('should not update key map on error', function(done) {
      done(); // TODO
    });

    it('should update store', function(done) {
      done(); // TODO
    });

    it('should limit list', function(done) {
      done(); // TODO
    });

    it('should let dupe keys push out older', function(done) {
      done(); // TODO
    });

    it('should not update list on error', function(done) {
      done(); // TODO
    });
  });

  describe('#shift()', function() {
    it('should handle empty list', function(done) {
      newList().shift(function cb(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO success', function(done) {
      newList().shift(function cb(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().put(this.key, this.val, function cb(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.shift(function shiftDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.store.del = storeErrCb;
        list.shift(function shiftDone() {
          list.keymap.should.deep.equal(self.oneKeyListEntry);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.storage[self.key].should.equal(self.val);
        list.shift(function shiftDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should update list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['b', 'c'],
            ['c'],
            []
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.shift(addSnapshot);
      list.shift(addSnapshot);
      list.shift(endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.store.del = storeErrCb;
        list.shift(function shiftDone() {
          list.head.key.should.equal(self.key);
          done();
        });
      });
    });
  });

  describe('#get()', function() {
    it('should propagate IO success', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.get(self.key, function getDone(err) {
          should.equal(err, null);
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.store.get = storeErrCb;
        list.get(self.key, function getDone(err) {
          should.equal(err, storeErr);
          done();
        });
      });
    });

    it('should raise from middle of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'c']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.remove('b', endSnapshots);
    });

    it('should not move newest of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'b', 'c']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.get('c', endSnapshots);
    });

    it('should raise from middle of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'c', 'b']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.get('b', endSnapshots);
    });

    it('should raise from oldest of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['b', 'c', 'a']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.get('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.put(self.key2, self.val2, function put2Done() {
          list.store.get = storeErrCb;
          list.get(self.key, function getDone() {
            list.tail.key.should.equal(self.key2);
            done();
          });
        });
      });
    });
  });

  describe('#getMulti()', function() {
    it('should propagate IO success', function(done) {
      done(); // TODO
    });

    it('should propagate IO error', function(done) {
      done(); // TODO
    });

    it('should raise from middle of list', function(done) {
      done(); // TODO
    });

    it('should not move newest of list', function(done) {
      done(); // TODO
    });

    it('should raise from middle of list', function(done) {
      done(); // TODO
    });

    it('should raise from oldest of list', function(done) {
      done(); // TODO
    });

    it('should not update list on error', function(done) {
      done(); // TODO
    });
  });

  describe('#remove()', function() {
    it('should propagate IO success', function(done) {
      newList().remove(this.key, function cb(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().remove(this.key, function cb(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.remove(self.key, function shiftDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.store.del = storeErrCb;
        list.remove(function shiftDone() {
          list.keymap.should.deep.equal(self.oneKeyListEntry);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.storage[self.key].should.equal(self.val);
        list.remove(self.key, function removeDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should remove newest of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'b']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.remove('c', endSnapshots);
    });

    it('should remove middle of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['a', 'c']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.remove('b', endSnapshots);
    });

    it('should remove oldest of list', function(done) {
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            ['a'],
            ['a', 'b'],
            ['a', 'b', 'c'],
            ['b', 'c']
          ]
        );
        done();
      }
      list.put('a', this.val, addSnapshot);
      list.put('b', this.val, addSnapshot);
      list.put('c', this.val, addSnapshot);
      list.remove('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.store.del = storeErrCb;
        list.remove(self.key, function delDone() {
          list.head.key.should.equal(self.key);
          done();
        });
      });
    });
  });

  describe('#removeMulti()', function() {
    it('should propagate IO success', function(done) {
      done(); // TODO
    });

    it('should propagate IO error', function(done) {
      done(); // TODO
    });

    it('should update key map', function(done) {
      done(); // TODO
    });

    it('should not update key map on error', function(done) {
      done(); // TODO
    });

    it('should update store', function(done) {
      done(); // TODO
    });

    it('should remove newest of list', function(done) {
      done(); // TODO
    });

    it('should remove middle of list', function(done) {
      done(); // TODO
    });

    it('should remove oldest of list', function(done) {
      done(); // TODO
    });

    it('should not update list on error', function(done) {
      done(); // TODO
    });
  });

  describe('integration', function() {
    it('should handle put/get/remove cycle', function(done) {
      var self = this;
      var list = newList();
      list.put(this.key, this.val, function putDone() {
        list.get(self.key, function getDone(err, val) {
          should.equal(val, self.val);
          list.remove(self.key, function delDone(err) {
            list.get(self.key, function getDone(err, val) {
              should.not.exist(val);
              done();
            });
          });
        });
      });
    });

    it('should handle putMulti/getMulti/removeMulti cycle', function(done) {
      done(); // TODO
    });
  });
});

describe('helpers', function() {
  describe('#getFirstCb()', function() {
    it('should return 1st function in array', function(done) {
      var fn1 = function() {};
      var fn2 = function() {};
      var arr = [1, 'foo', fn1, 2, fn2];
      getFirstCb(arr).should.deep.equal(fn1);
      done();
    });
  });
});

function emptyFn() {}
function getFirstCb(arr) {
  return arr.reduce(function(memo, arg) {
    if (memo) { return memo; }
    if ('function' === typeof arg) { return arg; }
  }, null);
}
function storeErrCb() {
  getFirstCb([].slice.call(arguments))(storeErr);
}
function newList(limit) {
  var storage = {};
  var list = new LRUList({
    limit: limit,
    set: function(key, val, done) {
      storage[key] = val;
      done(null);
    },
    setMulti: function(pairs, done) {
      for (var k = 0, keys = Object.keys(pairs); k < keys.length; k++) {
        storage[keys[k]] = pairs[keys[k]];
      }
    },
    get: function(key, done) {
      done(null, storage[key]);
    },
    getMulti: function(keys, done) {
      var pairs = {};
      for (var k = 0; k < keys.length; k++) {
        pairs[keys[k]] = storage[keys[k]];
      }
    },
    del: function(key, done) {
      delete storage[key];
      done(null);
    },
    delMulti: function(keys, done) {
      for (var k = 0; k < keys.length; k++) {
        delete storage[keys[k]];
      }
    }
  });
  list.storage = storage;
  return list;
}
function newListWithBrokenIO(limit) {
  return new LRUList({
    limit: limit,
    set: storeErrCb,
    setMulti: storeErrCb,
    get: storeErrCb,
    getMulti: storeErrCb,
    del: storeErrCb,
    delMulti: storeErrCb
  });
}
