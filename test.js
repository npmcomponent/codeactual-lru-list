var browserEnv = typeof window === 'object';

if (browserEnv) {
  mocha.setup('bdd');
} else {
  var chai = require('chai');
  var lruList = require('./build/build');
}

var should = chai.should();
chai.Assertion.includeStack = true;

var LRUList = lruList.LRUList;
var LRUEntry = lruList.LRUEntry;

var storeErr = new Error('store err');
var setErrCb = callFnAtArgWith(1, [storeErr]);
var getErrCb = callFnAtArgWith(1, [storeErr]);
var delErrCb = callFnAtArgWith(1, [storeErr]);

describe('LRUList', function() {
  before(function(done) {
    var store = {aa: 'AA', bb: 'BB', cc: 'CC'};
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

  describe('#set()', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      list.set(this.keys[0], this.vals[0], function (err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.keys[0], this.vals[0], function (err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.keymap.should.deep.equal(self.oneKeyMap);
        done();
      });
    });

    it('should not update key map on error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.keymap.should.deep.equal({});
        done();
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.set('d', this.vals[0], addSnapshot);
      list.set('e', this.vals[0], endSnapshots);
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.keys[0], this.vals[0], function setDone() {
        should.not.exist(list.head);
        done();
      });
    });
  });

  describe('#set() multi-key mode', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      list.set(this.pairs, function (err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.pairs, function (err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.keymap.should.deep.equal(self.multiKeyMap);
        done();
      });
    });

    it('should not update key map on error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.pairs, function setDone() {
        list.keymap.should.deep.equal({});
        done();
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
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
      list.set(this.pairs, addSnapshot);
      list.set(this.pairs, addSnapshot);
      list.set(this.pairs, endSnapshots);
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
      list.set(this.pairs, addSnapshot);
      list.set(this.pairs, addSnapshot);
      list.set(this.pairs, endSnapshots);
    });

    it('should not update list on error', function(done) {
      var list = newListWithBrokenIO();
      list.set(this.pairs, function setDone() {
        should.not.exist(list.head);
        done();
      });
    });
  });

  describe('#shift()', function() {
    it('should handle empty list', function(done) {
      newList().shift(function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO success', function(done) {
      newList().shift(function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().set(this.keys[0], this.vals[0], function(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.shift(function shiftDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
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
      list.set(this.keys[0], this.vals[0], function setDone() {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.shift(addSnapshot);
      list.shift(addSnapshot);
      list.shift(endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
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
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.get(self.keys[0], function getDone(err) {
          should.equal(err, null);
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.get('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.set(self.keys[1], self.vals[1], function set2Done() {
          list.settings.get = getErrCb;
          list.get(self.keys[0], function getDone() {
            list.tail.key.should.equal(self.keys[1]);
            done();
          });
        });
      });
    });
  });

  describe('#get() multi-key mode', function() {
    it('should propagate IO success', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.get(self.keys[0], function getDone(err) {
          should.equal(err, null);
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.settings.get = getErrCb;
        list.get(self.keys[0], function getDone(err) {
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
      list.set(this.pairs, addSnapshot);
      list.get([this.keys[2]], endSnapshots);
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
      list.set(this.pairs, addSnapshot);
      list.get([this.keys[1]], endSnapshots);
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
      list.set(this.pairs, addSnapshot);
      list.get([this.keys[0]], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.settings.get = getErrCb;
        list.get([self.keys[0]], function getDone() {
          list.tail.key.should.equal(self.keys[self.keys.length - 1]);
          done();
        });
      });
    });
  });

  describe('#del()', function() {
    it('should propagate IO success', function(done) {
      newList().del(this.keys[0], function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().del(this.keys[0], function(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.del(self.keys[0], function delDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.settings.del = delErrCb;
        list.del(self.keys[0], function() {
          list.keymap.should.deep.equal(self.oneKeyMap);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.storage[self.keys[0]].should.equal(self.vals[0]);
        list.del(self.keys[0], function delDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should del newest of list', function(done) {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.del('c', endSnapshots);
    });

    it('should del middle of list', function(done) {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.del('b', endSnapshots);
    });

    it('should del oldest of list', function(done) {
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
      list.set('a', this.vals[0], addSnapshot);
      list.set('b', this.vals[0], addSnapshot);
      list.set('c', this.vals[0], addSnapshot);
      list.del('a', endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.settings.del = delErrCb;
        list.del(self.keys[0], function delDone() {
          list.head.key.should.equal(self.keys[0]);
          done();
        });
      });
    });
  });

  describe('#del() multi-key mode', function() {
    it('should propagate IO success', function(done) {
      newList().del(this.keys, function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      newListWithBrokenIO().del(this.keys, function(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should update key map', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.del(self.keys, function delDone() {
          list.keymap.should.deep.equal({});
          done();
        });
      });
    });

    it('should not update key map on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.settings.del = delErrCb;
        list.del(self.keys, function delDone() {
          list.keymap.should.deep.equal(self.multiKeyMap);
          done();
        });
      });
    });

    it('should update store', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.storage.should.deep.equal(self.pairs);
        list.del(self.keys, function delDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should del newest of list', function(done) {
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
      list.set(this.pairs, addSnapshot);
      list.del([this.keys[2]], endSnapshots);
    });

    it('should del middle of list', function(done) {
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
      list.set(this.pairs, addSnapshot);
      list.del([this.keys[1]], endSnapshots);
    });

    it('should del oldest of list', function(done) {
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
      list.set(this.pairs, addSnapshot);
      list.del([this.keys[0]], endSnapshots);
    });

    it('should not update list on error', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.settings.del = getErrCb;
        list.del(self.keys, function delDone() {
          list.storage.should.deep.equal(self.pairs);
          done();
        });
      });
    });
  });

  describe('#has()', function() {
    it('should detect presence', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.has(self.keys[0]).should.be.ok;
        done();
      });
    });

    it('should detect absence', function(done) {
      newList().has(this.keys[0]).should.not.be.ok;
      done();
    });
  });

  describe('#delAll()', function() {
    it('should del all keys', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.delAll(function delDone() {
          list.storage.should.deep.equal({});
          done();
        });
      });
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      list.delAll(function(err) {
        should.equal(err, storeErr);
        done();
      });
    });
  });

  describe('#saveStruct()', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      list.saveStruct(this.keys[0], function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      list.saveStruct(this.keys[0], function(err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should save list/map structure', function(done) {
      var self = this;
      var list = newList();
      var key = 'myStructureKey';
      list.set(this.pairs, function setDone() {
        list.saveStruct(key, function saveDone() {
          list.get(key, function getDone(err, pairs) {
            var expected = [];
            expected[key] = self.keys;
            pairs.should.deep.equal(expected);
            done();
          });
        });
      });
    });
  });

  describe('#restoreStruct()', function() {
    it('should propagate IO success', function(done) {
      var list = newList();
      list.restoreStruct(this.keys[0], function(err) {
        should.equal(err, null);
        done();
      });
    });

    it('should propagate IO error', function(done) {
      var list = newListWithBrokenIO();
      list.restoreStruct(this.keys[0], function (err) {
        should.equal(err, storeErr);
        done();
      });
    });

    it('should restore list/map structure', function(done) {
      var self = this;
      var list = newList();
      var key = 'myStructureKey';
      list.storage[key] = this.keys;
      list.restoreStruct(key, function restoreDone() {
        list.keys().should.deep.equal(self.keys);
        done();
      });
    });
  });

  describe('integration', function() {
    it('should perform set/get/del cycle', function(done) {
      var self = this;
      var list = newList();
      list.set(this.keys[0], this.vals[0], function setDone() {
        list.get(self.keys[0], function getDone(err, pairs) {
          var expected = {};
          expected[self.keys[0]] = self.vals[0];
          pairs.should.deep.equal(expected);
          list.del(self.keys[0], function delDone(err) {
            list.get(self.keys[0], function getDone(err, pairs) {
              pairs.should.deep.equal({});
              done();
            });
          });
        });
      });
    });

    it('should perform set/get/del multi-key cycle', function(done) {
      var self = this;
      var list = newList();
      list.set(this.pairs, function setDone() {
        list.get(self.keys, function getDone(err, val) {
          val.should.deep.equal(self.pairs);
          list.del(self.keys, function delDone(err) {
            list.get(self.keys, function getDone(err, val) {
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
      .setOption('set', function(pairs, done) {
        for (var k = 0, keys = Object.keys(pairs); k < keys.length; k++) {
          storage[keys[k]] = pairs[keys[k]];
        }
        done(null);
      })
      .setOption('get', function(keys, done) {
        var pairs = {};
        for (var k = 0; k < keys.length; k++) {
          if (storage.hasOwnProperty(keys[k])) {
            pairs[keys[k]] = storage[keys[k]];
          }
        }
        done(null, pairs);
      })
      .setOption('del', function(keys, done) {
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
      .setOption('get', getErrCb)
      .setOption('del', delErrCb);
  return list;
}
