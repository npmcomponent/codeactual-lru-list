var chai = require('chai');
var should = chai.should();
chai.Assertion.includeStack = true;

var lruList = require('./index');
var LRUList = lruList.LRUList;
var LRUEntry = lruList.LRUEntry;

function emptyFn() {}

var storeErr = new Error('store err');

function getFirstCb(arr) {
  return arr.reduce(function(memo, arg) {
    if (memo) { return memo; }
    if ('function' === typeof arg) { return arg; }
  }, null);
}
function storeOkCb() {
  getFirstCb([].slice.call(arguments))();
};
function storeErrCb() {
  getFirstCb([].slice.call(arguments))(storeErr);
};

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

describe('LRUList', function() {
  before(function(done) {
    this.key = 'foo';
    this.value = 'bar';
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
      var list = new LRUList({set: storeOkCb});
      function cb(err) {
        should.equal(err, null);
        done();
      }
      list.put(this.key, this.value, cb);
    });

    it('should propagate IO error', function(done) {
      var list = new LRUList({set: storeErrCb});
      function cb(err) {
        should.equal(err, storeErr);
        done();
      }
      list.put(this.key, this.value, cb);
    });

    it('should update list', function(done) {
      var list = new LRUList({set: storeOkCb});
      var snapshots = [];
      function addSnapshot() {
        snapshots.push(list.toArray());
      }
      function endSnapshots() {
        addSnapshot();
        snapshots.should.deep.equal(
          snapshots,
          [
            ['a'],
            ['b', 'a'],
            ['c', 'b', 'a'],
            ['d', 'c', 'b', 'a']
          ]
        );
        done();
      }
      list.put('a', this.value, addSnapshot);
      list.put('b', this.value, addSnapshot);
      list.put('c', this.value, addSnapshot);
      list.put('d', this.value, endSnapshots);
    });
  });
});
