var chai = require('chai');
chai.should();
chai.Assertion.includeStack = true;

var LruList = require('./index');

describe('LruList', function() {
  describe('#LruList()', function() {
    it('should init state', function(done) {
      var list = new LruList();
      list.size = 0;
      list.config.limit.should.equal(100);
      done();
    });
  });
});
