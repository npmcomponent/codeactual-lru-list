/**
 * Storage agnostic LRU list.
 *
 * Based on https://github.com/rsms/js-lru
 *   Licensed under MIT.
 *   Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 */
module.exports = LruList;

var emptyFn = function() {};

/**
 * @param {object} config
 *   {number} [limit=100]
 *   {function} set
 *   {function} get
 *   {function} del
 */
function LruList(config) {
  config = config || {};
  this.size = 0;
  this.config = {
    limit: config.limit || 100,
    set: config.set || emptyFn,
    get: config.get || emptyFn,
    del: config.del || emptyFn
  };
}
