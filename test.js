var chai = require('chai');
var should = chai.should();
chai.Assertion.includeStack = true;

var lruList = require('./build/codeactual-lru-list');
var LRUList = lruList.LRUList;
var LRUEntry = lruList.LRUEntry;

var storeErr = new Error('store err');
var setErrCb = callFnAtArgWith(2, [storeErr]);
var setMultiErrCb = callFnAtArgWith(1, [storeErr]);
var getErrCb = callFnAtArgWith(1, [storeErr]);
var getMultiErrCb = callFnAtArgWith(1, [storeErr]);
var delErrCb = callFnAtArgWith(1, [storeErr]);
var delMultiErrCb = callFnAtArgWith(1, [storeErr]);

describe('LRUList', function() {
  before(function(done) {
    var store = {a: 'A', b: 'B', c: 'C'};
    this.keys = Object.keys(store);
    this.vals = [];
    this.entries = [];
    this.pairs = {};
    this.oneKeyMap = {};
    this.multiKeyMap = {};
    for (var k = 0; k < this.keys.length; k++) {
      this.vals[k] = store[this.keys[k]];
      this.pairs[this.keys[k]] = this.vals[k];
      this.entries[k] = new LRUEntry(this.keys[k]);
    }
    this.oneKeyMap[this.keys[0]] = new LRUEntry(this.keys[0]);
    this.multiKeyMap[this.keys[0]] = this.entries[0];
    this.multiKeyMap[this.keys[0]].newer = this.entries[1];
    this.multiKeyMap[this.keys[1]] = this.entries[1];
    this.multiKeyMap[this.keys[1]].older = this.entries[0];
    this.multiKeyMap[this.keys[1]].newer = this.entries[2];
    this.multiKeyMap[this.keys[2]] = this.entries[2];
    this.multiKeyMap[this.keys[2]].older = this.entries[1];
    done();
  });

  describe('#LRUList()', function() {
    it('should init state', function(done) {
      var list = new LRUList();
      list.size.should.equal(0);
      list.settings.limit.should.equal(-1);
      list.settings.set.should.be.instanceOf(Function);
      list.settings.get.should.be.instanceOf(Function);
      list.settings.del.should.be.instanceOf(Function);
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
      list.put(this.keys[0], this.vals[0], cb);
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      function cb(err) {
        should.equal(err, storeErr);
        done();
      }
      list.put(this.keys[0], this.vals[0], cb);
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.keymap.should.deep.equal(self.oneKeyMap);
        done();
      });
    });

    it('should not update key map on error', function(done) {
      var list = newListWithBrokenIO();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.keymap.should.deep.equal({});
        done();
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.storage[self.keys[0]].should.equal(self.vals[0]);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
      list.put('d', this.vals[0], addSnapshot);
      list.put('e', this.vals[0], endSnapshots);
    });

    it('should keep dupe keys for eventual shift', function(done) {
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var list = newListWithBrokenIO();
      list.put(this.keys[0], this.vals[0], function putDone() {
        should.not.exist(list.head);
        done();
      });
    });
  });

  describe('#putMulti()', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      function cb(err) {
        should.equal(err, null);
        done();
      }
      list.putMulti(this.pairs, cb);
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      function cb(err) {
        should.equal(err, storeErr);
        done();
      }
      list.putMulti(this.pairs, cb);
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.keymap.should.deep.equal(self.multiKeyMap);
        done();
      });
    });

    it('should not update key map on error', function(done) {
      var list = newListWithBrokenIO();
      list.putMulti(this.pairs, function putDone() {
        list.keymap.should.deep.equal({});
        done();
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        for (var k = 0; k < self.keys.length; k++) {
          list.storage[self.keys[k]].should.equal(self.vals[k]);
        }
        done();
      });
    });

    it('should limit list', function(done) {
      var self = this;
      var list = newList(3);
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            self.keys,
            self.keys
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.putMulti(this.pairs, addSnapshot);
      list.putMulti(this.pairs, endSnapshots);
    });

    it('should keep dupe keys for eventual shift', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [].concat(self.keys, self.keys),
            [].concat(self.keys, self.keys, self.keys)
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.putMulti(this.pairs, addSnapshot);
      list.putMulti(this.pairs, endSnapshots);
    });

    it('should not update list on error', function(done) {
      var list = newListWithBrokenIO();
      list.putMulti(this.pairs, function putDone() {
        should.not.exist(list.head);
        done();
      });
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
      newListWithBrokenIO().put(this.keys[0], this.vals[0], function cb(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.shift(function shiftDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.settings.del = delErrCb;
        list.shift(function shiftDone() {
          list.keymap.should.deep.equal(self.oneKeyMap);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.storage[self.keys[0]].should.equal(self.vals[0]);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
      list.shift(addSnapshot);
      list.shift(addSnapshot);
      list.shift(endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.settings.del = delErrCb;
        list.shift(function shiftDone() {
          list.head.key.should.equal(self.keys[0]);
          done();
        });
      });
    });
  });

  describe('#get()', function() {
    it('should propagate IO success', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.get(self.keys[0], function getDone(err) {
          should.equal(err, null);
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.settings.get = getErrCb;
        list.get(self.keys[0], function getDone(err) {
          should.equal(err, storeErr);
          done();
        });
      });
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
      list.get('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.put(self.keys[1], self.vals[1], function put2Done() {
          list.settings.get = getErrCb;
          list.get(self.keys[0], function getDone() {
            list.tail.key.should.equal(self.keys[1]);
            done();
          });
        });
      });
    });
  });

  describe('#getMulti()', function() {
    it('should propagate IO success', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.getMulti(self.keys[0], function getDone(err) {
          should.equal(err, null);
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.settings.getMulti = getMultiErrCb;
        list.getMulti(self.keys[0], function getDone(err) {
          should.equal(err, storeErr);
          done();
        });
      });
    });

    it('should not move newest of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[0], self.keys[1], self.keys[2]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.getMulti([this.keys[2]], endSnapshots);
    });

    it('should raise from middle of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[0], self.keys[2], self.keys[1]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.getMulti([this.keys[1]], endSnapshots);
    });

    it('should raise from oldest of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[1], self.keys[2], self.keys[0]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.getMulti([this.keys[0]], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.settings.getMulti = getMultiErrCb;
        list.getMulti([self.keys[0]], function getDone() {
          list.tail.key.should.equal(self.keys[self.keys.length - 1]);
          done();
        });
      });
    });
  });

  describe('#remove()', function() {
    it('should propagate IO success', function(done) {
      newList().remove(this.keys[0], function cb(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().remove(this.keys[0], function cb(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.remove(self.keys[0], function removeDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.settings.del = delErrCb;
        list.remove(self.keys[0], function() {
          list.keymap.should.deep.equal(self.oneKeyMap);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.storage[self.keys[0]].should.equal(self.vals[0]);
        list.remove(self.keys[0], function removeDone() {
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
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
      list.put('a', this.vals[0], addSnapshot);
      list.put('b', this.vals[0], addSnapshot);
      list.put('c', this.vals[0], addSnapshot);
      list.remove('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.settings.del = delErrCb;
        list.remove(self.keys[0], function delDone() {
          list.head.key.should.equal(self.keys[0]);
          done();
        });
      });
    });
  });

  describe('#removeMulti()', function() {
    it('should propagate IO success', function(done) {
      newList().removeMulti(this.keys, function cb(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().remove(this.keys, function cb(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.removeMulti(self.keys, function removeDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.settings.delMulti = delMultiErrCb;
        list.removeMulti(self.keys, function removeDone() {
          list.keymap.should.deep.equal(self.multiKeyMap);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.storage.should.deep.equal(self.pairs);
        list.removeMulti(self.keys, function removeDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should remove newest of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[0], self.keys[1]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.removeMulti([this.keys[2]], endSnapshots);
    });

    it('should remove middle of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[0], self.keys[2]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.removeMulti([this.keys[1]], endSnapshots);
    });

    it('should remove oldest of list', function(done) {
      var self = this;
      var list = newList();
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.keys());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          [
            self.keys,
            [self.keys[1], self.keys[2]]
          ]
        );
        done();
      }
      list.putMulti(this.pairs, addSnapshot);
      list.removeMulti([this.keys[0]], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.settings.delMulti = getMultiErrCb;
        list.removeMulti(self.keys, function removeDone() {
          list.storage.should.deep.equal(self.pairs);
          done();
        });
      });
    });
  });

  describe('integration', function() {
    it('should handle put/get/remove cycle', function(done) {
      var self = this;
      var list = newList();
      list.put(this.keys[0], this.vals[0], function putDone() {
        list.get(self.keys[0], function getDone(err, val) {
          should.equal(val, self.vals[0]);
          list.remove(self.keys[0], function delDone(err) {
            list.get(self.keys[0], function getDone(err, val) {
              should.not.exist(val);
              done();
            });
          });
        });
      });
    });

    it('should handle putMulti/getMulti/removeMulti cycle', function(done) {
      var self = this;
      var list = newList();
      list.putMulti(this.pairs, function putDone() {
        list.getMulti(self.keys, function getDone(err, val) {
          val.should.deep.equal(self.pairs);
          list.removeMulti(self.keys, function delDone(err) {
            list.getMulti(self.keys, function getDone(err, val) {
              val.should.deep.equal({});
              done();
            });
          });
        });
      });
    });
  });
});

function emptyFn() {}
function callFnAtArgWith(pos, payload) {
  return function() {
    var args = [].slice.call(arguments);
    if ('function' === typeof args[pos]) {
      args[pos].apply(null, payload);
    }
  };
}
function newList(limit) {
  var storage = {};
  var list = new LRUList();

  list.setOption('limit', limit)
      .setOption('set', function(key, val, done) {
        storage[key] = val;
        done(null);
      })
      .setOption('setMulti', function(pairs, done) {
        for (var k = 0, keys = Object.keys(pairs); k < keys.length; k++) {
          storage[keys[k]] = pairs[keys[k]];
        }
        done(null);
      })
      .setOption('get', function(key, done) {
        done(null, storage[key]);
      })
      .setOption('getMulti', function(keys, done) {
        var pairs = {};
        for (var k = 0; k < keys.length; k++) {
          if (storage.hasOwnProperty(keys[k])) {
            pairs[keys[k]] = storage[keys[k]];
          }
        }
        done(null, pairs);
      })
      .setOption('del', function(key, done) {
        delete storage[key];
        done(null);
      })
      .setOption('delMulti', function(keys, done) {
        for (var k = 0; k < keys.length; k++) {
          delete storage[keys[k]];
        }
        done(null);
      });

  list.storage = storage; // Expose for tests.

  return list;
}
function newListWithBrokenIO(limit) {
  var list = new LRUList();
  list.setOption('set', setErrCb)
      .setOption('setMulti', setMultiErrCb)
      .setOption('get', getErrCb)
      .setOption('getMulti', getMultiErrCb)
      .setOption('del', delErrCb)
      .setOption('delMulti', delMultiErrCb);
  return list;
}
