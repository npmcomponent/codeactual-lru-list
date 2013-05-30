Storage-agnostic LRU list with async/multi-key operations.

_Source: [lib/lru-list/index.js](../lib/lru-list/index.js)_

<a name="tableofcontents"></a>

- <a name="toc_exportslrulist"></a><a name="toc_exports"></a>[exports.LRUList](#exportslrulist)
- <a name="toc_exportslruentry"></a>[exports.LRUEntry](#exportslruentry)
- <a name="toc_lrulist"></a>[LRUList](#lrulist)
- <a name="toc_lruentrykey"></a>[LRUEntry](#lruentrykey)
- <a name="toc_lrulistprototypesetkey-val-cb"></a><a name="toc_lrulistprototype"></a>[LRUList.prototype.set](#lrulistprototypesetkey-val-cb)
- <a name="toc_lrulistprototypeshiftcb"></a>[LRUList.prototype.shift](#lrulistprototypeshiftcb)
- <a name="toc_lrulistprototypegetkeys-cb"></a>[LRUList.prototype.get](#lrulistprototypegetkeys-cb)
- <a name="toc_lrulistprototypedelkeys-cb"></a>[LRUList.prototype.del](#lrulistprototypedelkeys-cb)
- <a name="toc_lrulistprototypedelallcb"></a>[LRUList.prototype.delAll](#lrulistprototypedelallcb)
- <a name="toc_lrulistprototypekeys"></a>[LRUList.prototype.keys](#lrulistprototypekeys)
- <a name="toc_lrulistprototypehaskey"></a>[LRUList.prototype.has](#lrulistprototypehaskey)
- <a name="toc_lrulistprototypesavestructkey-cb"></a>[LRUList.prototype.saveStruct](#lrulistprototypesavestructkey-cb)
- <a name="toc_lrulistprototyperestorestructkey-cb"></a>[LRUList.prototype.restoreStruct](#lrulistprototyperestorestructkey-cb)

<a name="exports"></a>

# exports.LRUList()

> Reference to [LRUList](#lrulist).

<sub>Go: [TOC](#tableofcontents) | [exports](#toc_exports)</sub>

# exports.LRUEntry()

> Reference to [LRUEntry](#lruentrykey).

<sub>Go: [TOC](#tableofcontents) | [exports](#toc_exports)</sub>

# LRUList()

> LRUList constructor.

**Configuration:**

- `{number} [limit=-1]` Max list size, by default (`-1`) unlimited
- `{function} set` Backend handler
- `{function} get` Backend handler
- `{function} del` Backend handler

**Properties:**

- `{number} size` Current key count
- `{object} tail` Reference to most recently used [LRUEntry](#lruentrykey)
- `{object} head` Reference to least recently used [LRUEntry](#lruentrykey)
- `{object} keymap` [LRUEntry](#lruentrykey) objects of the list indexed by key

<sub>Go: [TOC](#tableofcontents)</sub>

# LRUEntry(key)

> LRUEntry constructor.

**Properties:**

- `{string} key`
- `{object} older` Reference to the less recently used LRUEntry
- `{object} newer` Reference to more recently used LRUEntry

**Parameters:**

- `{string} key`

<sub>Go: [TOC](#tableofcontents)</sub>

<a name="lrulistprototype"></a>

# LRUList.prototype.set(key, val, cb)

> Append keys to the list's tail in object-key order. Trigger storage of the values.

- Duplicate keys are allowed by original design.
  - May produce "orphaned" entries to which the key map no longer points.
  - Then they can no longer be read/deleted, and can only be pushed out by lack of use.

**Parameters:**

- `{string | object} key` May hold key/value pairs, not just a key string.
- `{mixed} val` If `key` is an object, this will be `cb`.
- `{function} cb` If `key` is an object, this will be undefined. Receives args:
  - `{object}` `Error` or `null`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.shift(cb)

> Remove the key at the list's head (the LRU). Trigger removal of the value.

**Parameters:**

- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`
  - `{mixed}` Shifted [LRUEntry](#lruentrykey) or undefined.

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.get(keys, cb)

> Promote the keys to the tail (MRU) in array order. Read the values from storage.

**Parameters:**

- `{string | array} keys`
- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`
  - `{mixed}` Key/value pairs or undefined.

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.del(keys, cb)

> Remove keys from the list and key map. Trigger removal of the values.

**Parameters:**

- `{string | array} keys`
- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.delAll(cb)

> Delete all keys.

**Parameters:**

- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.keys()

> Produce the key list ordered least-to-most recently used.

**Return:**

`{array}`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.has(key)

> Check if a key exists.

**Parameters:**

- `{string} key`

**Return:**

`{boolean}`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.saveStruct(key, cb)

> Save the key list to the storage backend.

**Parameters:**

- `{string} key`
- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

# LRUList.prototype.restoreStruct(key, cb)

> Restore the list from the storage backend.

Reuses on [LRUList.prototype.delAll](#lrulistprototypedelallcb) and `_updateStructForPut()` to regenerate the list/map.

**Parameters:**

- `{string} key`
- `{function} cb` Receives arguments:
  - `{object}` `Error` or `null`

<sub>Go: [TOC](#tableofcontents) | [LRUList.prototype](#toc_lrulistprototype)</sub>

_&mdash;generated by [apidox](https://github.com/codeactual/apidox)&mdash;_
