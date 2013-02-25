/**
 * Storage agnostic LRU list.
 *   Uses doubly-linked list and key map.
 *   Supports async get, set, etc.
 *
 * Based on https://github.com/rsms/js-lru
 *   Licensed under MIT.
 *   Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 *   Illustration of the original design:
 *
 *    entry             entry             entry             entry
 *    ______            ______            ______            ______
 *   | head |.newer => |      |.newer => |      |.newer => | tail |
 *   |  A   |          |  B   |          |  C   |          |  D   |
 *   |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *    removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
module.exports = {
  LRUList: LRUList,
  LRUEntry: LRUEntry
};

var emptyFn = function() {};

/**
 * @param {object} config
 *   {number} [limit=100]
 *   {function} set(key, val, done)
 *     done(err)
 *   {function} get(key, done)
 *     done(err, val)
 *   {function} del(key, done)
 *     done(err)
 *
 * done() callbacks:
 *   'err' should be an Error instance.
 *   List structures will not be modified on truthy 'err'.
 */
function LRUList(config) {
  config = config || {};
  this.size = 0;
  this.tail = undefined;
  this.head = undefined;
  this.limit = config.limit || 100;
  this.store = {
    set: config.set || emptyFn,
    get: config.get || emptyFn,
    del: config.del || emptyFn
  };
  this.keymap = {};
}

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
 *   can no longer be read/removed, and can only be pushed out by lack of use.
 *
 * @param {string} key
 * @param {mixed} val
 * @param {function} done
 *   {object} Error instance or null.
 */
LRUList.prototype.put = function(key, val, done) {
  done = done || function putDoneNoOp() {};
  var self = this;

  this.store.set(key, val, function storeIODone(err) {
    if (err) { done(err); return; } // I/O failed, maintain current list/map.

    var entry = new LRUEntry(key); // Create new tail.
    self.keymap[key] = entry;

    if (self.tail) { // Link old tail to new tail.
      self.tail.newer = entry;
      entry.older = self.tail;
    } else { // First entry.
      self.head = entry;
    }

    self.tail = entry; // Assign new tail.

    if (self.size === self.limit) { // List size exceeded. Trim head.
      self.shift(done);
    } else {
      self.size++;
      done(null);
    }
  });
};

/**
 * Remove the key at the list's head (the LRU). Trigger removal of the value.
 *
 * @param {function} done
 *   {object} Error instance or null.
 *   {mixed} Shifted LRUEntry or undefined.
 */
LRUList.prototype.shift = function(done) {
  done = done || function shiftDoneNoOp() {};
  var self = this;

  var entry = this.head;
  if (!entry) { // List already empty.
    done(null);
    return;
  }

  if (this.head.newer) { // 2nd-to-head is now head.
    this.head = this.head.newer;
    this.head.older = undefined;
  } else { // Head was the only entry.
    this.head = undefined;
  }

  // Remove last strong reference to <entry> and remove links from the purged
  // entry being returned.
  entry.newer = entry.older = undefined;

  this.store.del(entry.key, function storeIODone(err) {
    if (err) { done(err); return; } // I/O failed, maintain current list/map.

    delete self.keymap[entry.key];
    done(null, entry);
  });
};

/**
 * Promote the key to the tail (MRU). Read the value from storage.
 *
 * @param {string} key
 * @param {function} done
 *   {object} Error instance or null.
 *   {mixed} Value or undefined.
 */
LRUList.prototype.get = function(key, done) {
  done = done || function getDoneNoOp() {};
  var self = this;

  this.store.get(key, function storeIODone(err, val) {
    if (err) { done(err); return; } // I/O failed, maintain current list/map.

    var entry = self.keymap[key];

    if (entry === undefined) { done(null); return; } // Key miss.
    if (entry === self.tail) { done(null, val); return; } // Key already MRU.

    if (entry.newer) { // Key has more-recently-used than it.
      if (entry === self.head) {
        self.head = entry.newer; // 2nd-to-head is now head.
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
    entry.older = self.tail;
    if (self.tail) { self.tail.newer = entry; }

    self.tail = entry;

    done(null, val);
  });
};

/**
 * Remove the key from the list and key map. Trigger removal of the value.
 *
 * @param {string} key
 * @param {function} done
 *   {object} Error instance or null.
 */
LRUList.prototype.remove = function(key, done) {
  done = done || function removeDoneNoOp() {};
  var self = this;

  this.store.del(key, function storeIODone(err) {
    if (err) { done(err); return; } // I/O failed, maintain current list/map.

    var entry = self.keymap[key];
    if (!entry) { done(null); return; } // Key miss.

    delete self.keymap[entry.key];

    if (entry.newer && entry.older) {
      // Connect adjacent entries to fill the future gap it will leave.
      entry.older.newer = entry.newer;
      entry.newer.older = entry.older;
    } else if (entry.newer) { // Removing head.
      entry.newer.older = undefined;
      self.head = entry.newer;
    } else if (entry.older) { // Removing tail.
      entry.older.newer = undefined;
      self.tail = entry.older;
    } else { // Removing sole key in list.
      self.head = self.tail = undefined;
    }

    self.size--;

    done(null);
  });
}

/**
 * Produce a head-to-tail key list.
 */
LRUList.prototype.toArray = function() {
  var arr = [];
  var entry = this.head;
  while (entry) {
    arr.push(entry.key);
    entry = entry.newer;
  }
  return arr;
};
