# 1.3.0

* Fix NPM compatibility.

# 1.2.1

* Update repo of `batch` component.

# 1.2.0

* Remove `setMulti/getMulti/delMulti` in favor of multi-key-only support through `set/get/del`. Storage handlers will always receive multi-key input types.

# 1.1.1

* Upgrade `codeactual/is` to 0.1.3

# 1.1.0

* Rename `put*` to `set*`, `remove*` to `del*`.
* Replace LRUList() configuration object with [configurable.js](https://github.com/visionmedia/configurable.js/).
* Replace Default 100 entry limit with no limit.
* Add `setMulti`,  `getMulti`, `delMulti`, `has`, `delAll`.
* Add Serialization of list to the storage backend and keymap regeneration via `saveStruct` and `restoreStruct`.
* Fix shift() did not wait for storage deletion success before updating list.

# 1.0.0

* Add initial API and tests for `set`, `shift`, `get`, `del`, `keys`.
