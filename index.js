/**
 * Storage-agnostic LRU list with async/multi-key operations.
 *
 * Based on https://github.com/rsms/js-lru
 *   Licensed under MIT.
 *   Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 *
 * Additions to rsms/js-lru:
 *   Licensed under MIT.
 *   Copyright (c) 2013 David Smith <https://github.com/codeactual/>
 *
 * Original illustration of the design from rsms/js-lru:
 *
 *    entry             entry             entry             entry
 *    ______            ______            ______            ______
 *   | head |.newer => |      |.newer => |      |.newer => | tail |
 *   |  A   |          |  B   |          |  C   |          |  D   |
 *   |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *    deld  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
module.exports = {
  LRUList: LRUList,
  LRUEntry: LRUEntry
};

var Batch = require('batch');
var Configurable = require('configurable.js');
var is = require('is');

function lruListNoOp() {}

/**
 * See https://github.com/codeactual/lru-list#api for configurable settings.
 */
function LRUList() {
  this.size = 0;
  this.tail = undefined;
  this.head = undefined;
  this.keymap = {};

  this.settings = {
    limit: -1,
    set: lruListNoOp,
    setMulti: lruListNoOp,
    get: lruListNoOp,
    getMulti: lruListNoOp,
    del: lruListNoOp,
    delMulti: lruListNoOp
  };
}

Configurable(LRUList.prototype);

// Work around naming conflict.
LRUList.prototype.setOption = LRUList.prototype.set;
LRUList.prototype.getOption = LRUList.prototype.get;

function LRUEntry(key) {
  this.key = key;
  this.older = undefined;
  this.newer = undefined;
}

/**
 * Append key to the list's tail. Trigger storage of the value.
 *
 * - Duplicate keys are allowed by original design.
 *   May produce "orphaned" entries to which the key map no longer points. Then they
 *   can no longer be read/deld, and can only be pushed out by lack of use.
 *
 * @param {string} key
 * @param {mixed} val
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.set = function(key, val, cb) {
  cb = cb || lruListNoOp;
  var self = this;
  this.settings.set(key, val, function storeIODone(err) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.
    self._updateStructForPut(key, cb);
  });
};

/**
 * Append keys to the list's tail in object-key order. Trigger storage of the values.
 *
 * - Duplicate keys are allowed by original design.
 *   May produce "orphaned" entries to which the key map no longer points. Then they
 *   can no longer be read/deld, and can only be pushed out by lack of use.
 *
 * @param {object} pairs
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.setMulti = function(pairs, cb) {
  cb = cb || lruListNoOp;
  var self = this;

  this.settings.setMulti(pairs, function storeIODone(err) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.

    var batch = new Batch();

    Object.keys(pairs).forEach(function batchKey(key) {
      batch.push(function batchPush(taskDone) {
        self._updateStructForPut(key, taskDone);
      });
    });

    batch.end(cb);
  });
};

/**
 * Apply a set/setMulti operation to the list/map structures.
 *
 * @param {string} key
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype._updateStructForPut = function(key, cb) {
  var entry = new LRUEntry(key); // Create new tail.
  this.keymap[key] = entry;

  if (this.tail) { // Link old tail to new tail.
    this.tail.newer = entry;
    entry.older = this.tail;
  } else { // First entry.
    this.head = entry;
  }

  this.tail = entry; // Assign new tail.

  if (this.size === this.settings.limit) { // List size exceeded. Trim head.
    this.shift(cb);
  } else {
    this.size++;
    cb(null);
  }
};

/**
 * Remove the key at the list's head (the LRU). Trigger removal of the value.
 *
 * @param {function} cb
 *   {object} Error instance or null.
 *   {mixed} Shifted LRUEntry or undefined.
 */
LRUList.prototype.shift = function(cb) {
  cb = cb || lruListNoOp;
  var self = this;

  var entry = this.head;
  if (!entry) { // List already empty.
    cb(null);
    return;
  }

  // Allow exclusive use of single- or multi-key handlers.
  var method = this.settings.del === lruListNoOp ? 'delMulti' : 'del';

  this.settings[method](entry.key, function storeIODone(err) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.

    if (self.head.newer) { // 2nd-to-head is now head.
      self.head = self.head.newer;
      self.head.older = undefined;
    } else { // Head was the only entry.
      self.head = undefined;
    }

    // Remove last strong reference to <entry> and del links from the purged
    // entry being returned.
    entry.newer = entry.older = undefined;

    delete self.keymap[entry.key];
    cb(null, entry);
  });
};

/**
 * Promote the key to the tail (MRU). Read the value from storage.
 *
 * @param {string|array} key
 * @param {function} cb
 *   {object} Error instance or null.
 *   {mixed} Value or undefined.
 */
LRUList.prototype.get = function(key, cb) {
  cb = cb || lruListNoOp;
  var self = this;

  this.settings.get(key, function storeIODone(err, val) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.

    var entry = self.keymap[key];
    if (entry === undefined) { cb(null); return; } // Key miss.
    if (entry === self.tail) { cb(null, val); return; } // Key already MRU.

    self._updateStructForGet(entry);
    cb(null, val);
  });
};

/**
 * Promote the keys to the tail (MRU) in array order. Read the values from storage.
 *
 * @param {array} keys
 * @param {function} cb
 *   {object} Error instance or null.
 *   {mixed} Key/value pairs or undefined.
 */
LRUList.prototype.getMulti = function(keys, cb) {
  cb = cb || lruListNoOp;
  var self = this;

  this.settings.getMulti(keys, function storeIODone(err, pairs) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.
    for (var k = 0; k < keys.length; k++) {
      var entry = self.keymap[keys[k]];
      if (entry === undefined) { continue; } // Key miss.
      if (entry === self.tail) { continue; } // Key already MRU.
      self._updateStructForGet(entry);
    }
    cb(null, pairs);
  });
};

/**
 * Apply a get/getMulti operation to the list/map structures.
 *
 * @param {object} entry LRUEntry instance.
 */
LRUList.prototype._updateStructForGet = function(entry) {
  if (entry.newer) { // Key has more-recently-used than it.
    if (entry === this.head) {
      this.head = entry.newer; // 2nd-to-head is now head.
    }
    // Connect adjacent entries to fill the future gap it will leave.
    entry.newer.older = entry.older;
  }
  if (entry.older) { // Key has less-recently-used than it.
    // Connect adjacent entries to fill the future gap it will leave.
    entry.older.newer = entry.newer;
  }

  entry.newer = undefined; // Entry will be newest.

  // Move current tail will 2nd-to-tail positiion.
  entry.older = this.tail;
  if (this.tail) { this.tail.newer = entry; }

  this.tail = entry;
};

/**
 * Remove the key from the list and key map. Trigger removal of the value.
 *
 * @param {string} key
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.del = function(key, cb) {
  cb = cb || lruListNoOp;
  var self = this;

  this.settings.del(key, function storeIODone(err) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.
    self._updateStructForRemove(key);
    cb(null);
  });
};

/**
 * Remove keys from the list and key map. Trigger removal of the values.
 *
 * @param {array} keys
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.delMulti = function(keys, cb) {
  cb = cb || lruListNoOp;
  var self = this;

  this.settings.delMulti(keys, function storeIODone(err) {
    if (err) { cb(err); return; } // I/O failed, maintain current list/map.
    for (var k = 0; k < keys.length; k++) {
      self._updateStructForRemove(keys[k]);
    }
    cb(null);
  });
};

/**
 * Apply a del/delMulti operation to the list/map structures.
 *
 * @param {string} key
 */
LRUList.prototype._updateStructForRemove = function(key) {
  var entry = this.keymap[key];
  if (!entry) { return; } // Key miss.

  delete this.keymap[entry.key];

  if (entry.newer && entry.older) {
    // Connect adjacent entries to fill the future gap it will leave.
    entry.older.newer = entry.newer;
    entry.newer.older = entry.older;
  } else if (entry.newer) { // Removing head.
    entry.newer.older = undefined;
    this.head = entry.newer;
  } else if (entry.older) { // Removing tail.
    entry.older.newer = undefined;
    this.tail = entry.older;
  } else { // Removing sole key in list.
    this.head = this.tail = undefined;
  }

  this.size--;
};

/**
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.delAll = function(cb) {
  this.delMulti(this.keys(), cb);
};

/**
 * Produce a head-to-tail ordered key list.
 *
 * @return {array}
 */
LRUList.prototype.keys = function() {
  var arr = [];
  var entry = this.head;
  while (entry) {
    arr.push(entry.key);
    entry = entry.newer;
  }
  return arr;
};

/**
 * Check if a key exists.
 *
 * @param {string} key
 * @return {boolean}
 */
LRUList.prototype.has = function(key) {
  return this.keymap.hasOwnProperty(key);
};

/**
 * Save the key list to the storage backend.
 *
 * @param {string} key
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.saveStruct = function(key, cb) {
  this.set(key, this.keys(), function(err) {
    cb(err);
  });
};

/**
 * Restore the list from the storage backend.
 *
 * Reuses on delAll() and _updateStructForPut() to regenerate the list/map.
 *
 * @param {string} key
 * @param {function} cb
 *   {object} Error instance or null.
 */
LRUList.prototype.restoreStruct = function(key, cb) {
  var self = this;
  this.settings.get(key, function getDone(err, keys) {
    if (err) { cb(err); return; }
    self.delAll(function delDone(err) {
      if (err) { cb(err); return; }
      if (typeof keys !== 'undefined' && is.array(keys)) {
        var batch = new Batch();
        keys.forEach(function batchKey(key) {
          batch.push(function batchPush(taskDone) {
            self._updateStructForPut(key, taskDone);
          });
        });
        batch.end(cb);
      } else {
        cb(null); // Nothing to restore.
      }
    });
  });
};
