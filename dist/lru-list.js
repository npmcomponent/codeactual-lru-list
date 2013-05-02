(function() {
    function require(path, parent, orig) {
        var resolved = require.resolve(path);
        if (null == resolved) {
            orig = orig || path;
            parent = parent || "root";
            var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
            err.path = orig;
            err.parent = parent;
            err.require = true;
            throw err;
        }
        var module = require.modules[resolved];
        if (!module.exports) {
            module.exports = {};
            module.client = module.component = true;
            module.call(this, module.exports, require.relative(resolved), module);
        }
        return module.exports;
    }
    require.modules = {};
    require.aliases = {};
    require.resolve = function(path) {
        if (path.charAt(0) === "/") path = path.slice(1);
        var index = path + "/index.js";
        var paths = [ path, path + ".js", path + ".json", path + "/index.js", path + "/index.json" ];
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (require.modules.hasOwnProperty(path)) return path;
        }
        if (require.aliases.hasOwnProperty(index)) {
            return require.aliases[index];
        }
    };
    require.normalize = function(curr, path) {
        var segs = [];
        if ("." != path.charAt(0)) return path;
        curr = curr.split("/");
        path = path.split("/");
        for (var i = 0; i < path.length; ++i) {
            if (".." == path[i]) {
                curr.pop();
            } else if ("." != path[i] && "" != path[i]) {
                segs.push(path[i]);
            }
        }
        return curr.concat(segs).join("/");
    };
    require.register = function(path, definition) {
        require.modules[path] = definition;
    };
    require.alias = function(from, to) {
        if (!require.modules.hasOwnProperty(from)) {
            throw new Error('Failed to alias "' + from + '", it does not exist');
        }
        require.aliases[to] = from;
    };
    require.relative = function(parent) {
        var p = require.normalize(parent, "..");
        function lastIndexOf(arr, obj) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === obj) return i;
            }
            return -1;
        }
        function localRequire(path) {
            var resolved = localRequire.resolve(path);
            return require(resolved, parent, path);
        }
        localRequire.resolve = function(path) {
            var c = path.charAt(0);
            if ("/" == c) return path.slice(1);
            if ("." == c) return require.normalize(p, path);
            var segs = parent.split("/");
            var i = lastIndexOf(segs, "deps") + 1;
            if (!i) i = 0;
            path = segs.slice(0, i + 1).join("/") + "/deps/" + path;
            return path;
        };
        localRequire.exists = function(path) {
            return require.modules.hasOwnProperty(localRequire.resolve(path));
        };
        return localRequire;
    };
    require.register("component-emitter/index.js", function(exports, require, module) {
        module.exports = Emitter;
        function Emitter(obj) {
            if (obj) return mixin(obj);
        }
        function mixin(obj) {
            for (var key in Emitter.prototype) {
                obj[key] = Emitter.prototype[key];
            }
            return obj;
        }
        Emitter.prototype.on = function(event, fn) {
            this._callbacks = this._callbacks || {};
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
            return this;
        };
        Emitter.prototype.once = function(event, fn) {
            var self = this;
            this._callbacks = this._callbacks || {};
            function on() {
                self.off(event, on);
                fn.apply(this, arguments);
            }
            fn._off = on;
            this.on(event, on);
            return this;
        };
        Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = function(event, fn) {
            this._callbacks = this._callbacks || {};
            if (0 == arguments.length) {
                this._callbacks = {};
                return this;
            }
            var callbacks = this._callbacks[event];
            if (!callbacks) return this;
            if (1 == arguments.length) {
                delete this._callbacks[event];
                return this;
            }
            var i = callbacks.indexOf(fn._off || fn);
            if (~i) callbacks.splice(i, 1);
            return this;
        };
        Emitter.prototype.emit = function(event) {
            this._callbacks = this._callbacks || {};
            var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, args);
                }
            }
            return this;
        };
        Emitter.prototype.listeners = function(event) {
            this._callbacks = this._callbacks || {};
            return this._callbacks[event] || [];
        };
        Emitter.prototype.hasListeners = function(event) {
            return !!this.listeners(event).length;
        };
    });
    require.register("visionmedia-batch/index.js", function(exports, require, module) {
        try {
            var EventEmitter = require("events").EventEmitter;
        } catch (err) {
            var Emitter = require("emitter");
        }
        function noop() {}
        module.exports = Batch;
        function Batch() {
            this.fns = [];
            this.concurrency(Infinity);
            for (var i = 0, len = arguments.length; i < len; ++i) {
                this.push(arguments[i]);
            }
        }
        if (EventEmitter) {
            Batch.prototype.__proto__ = EventEmitter.prototype;
        } else {
            Emitter(Batch.prototype);
        }
        Batch.prototype.concurrency = function(n) {
            this.n = n;
            return this;
        };
        Batch.prototype.push = function(fn) {
            this.fns.push(fn);
            return this;
        };
        Batch.prototype.end = function(cb) {
            var self = this, total = this.fns.length, pending = total, results = [], cb = cb || noop, fns = this.fns, max = this.n, index = 0, done;
            if (!fns.length) return cb(null, results);
            function next() {
                var i = index++;
                var fn = fns[i];
                if (!fn) return;
                var start = new Date();
                fn(function(err, res) {
                    if (done) return;
                    if (err) return done = true, cb(err);
                    var complete = total - pending + 1;
                    var end = new Date();
                    results[i] = res;
                    self.emit("progress", {
                        index: i,
                        value: res,
                        pending: pending,
                        total: total,
                        complete: complete,
                        percent: complete / total * 100 | 0,
                        start: start,
                        end: end,
                        duration: end - start
                    });
                    if (--pending) next(); else cb(null, results);
                });
            }
            for (var i = 0; i < fns.length; i++) {
                if (i == max) break;
                next();
            }
            return this;
        };
    });
    require.register("visionmedia-configurable.js/index.js", function(exports, require, module) {
        module.exports = function(obj) {
            obj.settings = {};
            obj.set = function(name, val) {
                if (1 == arguments.length) {
                    for (var key in name) {
                        this.set(key, name[key]);
                    }
                } else {
                    this.settings[name] = val;
                }
                return this;
            };
            obj.get = function(name) {
                return this.settings[name];
            };
            obj.enable = function(name) {
                return this.set(name, true);
            };
            obj.disable = function(name) {
                return this.set(name, false);
            };
            obj.enabled = function(name) {
                return !!this.get(name);
            };
            obj.disabled = function(name) {
                return !this.get(name);
            };
            return obj;
        };
    });
    require.register("manuelstofer-each/index.js", function(exports, require, module) {
        "use strict";
        var nativeForEach = [].forEach;
        module.exports = function(obj, iterator, context) {
            if (obj == null) return;
            if (nativeForEach && obj.forEach === nativeForEach) {
                obj.forEach(iterator, context);
            } else if (obj.length === +obj.length) {
                for (var i = 0, l = obj.length; i < l; i++) {
                    if (iterator.call(context, obj[i], i, obj) === {}) return;
                }
            } else {
                for (var key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        if (iterator.call(context, obj[key], key, obj) === {}) return;
                    }
                }
            }
        };
    });
    require.register("codeactual-is/index.js", function(exports, require, module) {
        "use strict";
        var each = require("each");
        var types = [ "Arguments", "Function", "String", "Number", "Date", "RegExp", "Array" ];
        each(types, function(type) {
            var method = type === "Function" ? type : type.toLowerCase();
            module.exports[method] = function(obj) {
                return Object.prototype.toString.call(obj) === "[object " + type + "]";
            };
        });
        if (Array.isArray) {
            module.exports.array = Array.isArray;
        }
        module.exports.object = function(obj) {
            return obj === Object(obj);
        };
    });
    require.register("lru-list/lib/lru-list/index.js", function(exports, require, module) {
        exports.LRUList = LRUList;
        exports.LRUEntry = LRUEntry;
        var Batch = require("batch");
        var configurable = require("configurable.js");
        var is = require("is");
        function LRUList() {
            this.settings = {
                limit: -1,
                set: lruListNoOp,
                get: lruListNoOp,
                del: lruListNoOp
            };
            this.size = 0;
            this.tail = undefined;
            this.head = undefined;
            this.keymap = {};
        }
        configurable(LRUList.prototype);
        LRUList.prototype.setOption = LRUList.prototype.set;
        LRUList.prototype.getOption = LRUList.prototype.get;
        function LRUEntry(key) {
            this.key = key;
            this.older = undefined;
            this.newer = undefined;
        }
        LRUList.prototype.set = function(key, val, cb) {
            var self = this;
            var pairs = {};
            if (is.object(key)) {
                pairs = key;
                cb = val || lruListNoOp;
            } else {
                pairs[key] = val;
            }
            this.getOption("set")(pairs, function storeIODone(err) {
                if (err) {
                    cb(err);
                    return;
                }
                var batch = new Batch();
                Object.keys(pairs).forEach(function batchKey(key) {
                    batch.push(function batchPush(taskDone) {
                        self._updateStructForPut(key, taskDone);
                    });
                });
                batch.end(cb);
            });
        };
        LRUList.prototype._updateStructForPut = function(key, cb) {
            var entry = new LRUEntry(key);
            this.keymap[key] = entry;
            if (this.tail) {
                this.tail.newer = entry;
                entry.older = this.tail;
            } else {
                this.head = entry;
            }
            this.tail = entry;
            if (this.size === this.getOption("limit")) {
                this.shift(cb);
            } else {
                this.size++;
                cb(null);
            }
        };
        LRUList.prototype.shift = function(cb) {
            cb = cb || lruListNoOp;
            var self = this;
            var entry = this.head;
            if (!entry) {
                cb(null);
                return;
            }
            this.getOption("del")([ entry.key ], function storeIODone(err) {
                if (err) {
                    cb(err);
                    return;
                }
                if (self.head.newer) {
                    self.head = self.head.newer;
                    self.head.older = undefined;
                } else {
                    self.head = undefined;
                }
                entry.newer = entry.older = undefined;
                delete self.keymap[entry.key];
                cb(null, entry);
            });
        };
        LRUList.prototype.get = function(keys, cb) {
            keys = [].concat(keys);
            cb = cb || lruListNoOp;
            var self = this;
            this.getOption("get")(keys, function storeIODone(err, pairs) {
                if (err) {
                    cb(err);
                    return;
                }
                for (var k = 0; k < keys.length; k++) {
                    var entry = self.keymap[keys[k]];
                    if (entry === undefined) {
                        continue;
                    }
                    if (entry === self.tail) {
                        continue;
                    }
                    self._updateStructForGet(entry);
                }
                cb(null, pairs);
            });
        };
        LRUList.prototype._updateStructForGet = function(entry) {
            if (entry.newer) {
                if (entry === this.head) {
                    this.head = entry.newer;
                }
                entry.newer.older = entry.older;
            }
            if (entry.older) {
                entry.older.newer = entry.newer;
            }
            entry.newer = undefined;
            entry.older = this.tail;
            if (this.tail) {
                this.tail.newer = entry;
            }
            this.tail = entry;
        };
        LRUList.prototype.del = function(keys, cb) {
            keys = [].concat(keys);
            cb = cb || lruListNoOp;
            var self = this;
            this.getOption("del")(keys, function storeIODone(err) {
                if (err) {
                    cb(err);
                    return;
                }
                for (var k = 0; k < keys.length; k++) {
                    self._updateStructForRemove(keys[k]);
                }
                cb(null);
            });
        };
        LRUList.prototype._updateStructForRemove = function(key) {
            var entry = this.keymap[key];
            if (!entry) {
                return;
            }
            delete this.keymap[entry.key];
            if (entry.newer && entry.older) {
                entry.older.newer = entry.newer;
                entry.newer.older = entry.older;
            } else if (entry.newer) {
                entry.newer.older = undefined;
                this.head = entry.newer;
            } else if (entry.older) {
                entry.older.newer = undefined;
                this.tail = entry.older;
            } else {
                this.head = this.tail = undefined;
            }
            this.size--;
        };
        LRUList.prototype.delAll = function(cb) {
            this.del(this.keys(), cb);
        };
        LRUList.prototype.keys = function() {
            var arr = [];
            var entry = this.head;
            while (entry) {
                arr.push(entry.key);
                entry = entry.newer;
            }
            return arr;
        };
        LRUList.prototype.has = function(key) {
            return this.keymap.hasOwnProperty(key);
        };
        LRUList.prototype.saveStruct = function(key, cb) {
            var pairs = {};
            pairs[key] = this.keys();
            this.getOption("set")(pairs, function(err) {
                cb(err);
            });
        };
        LRUList.prototype.restoreStruct = function(key, cb) {
            var self = this;
            this.getOption("get")([ key ], function getDone(err, pairs) {
                if (err) {
                    cb(err);
                    return;
                }
                self.delAll(function delDone(err) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    var keys = pairs[key];
                    if (typeof keys !== "undefined" && is.array(keys)) {
                        var batch = new Batch();
                        keys.forEach(function batchKey(key) {
                            batch.push(function batchPush(taskDone) {
                                self._updateStructForPut(key, taskDone);
                            });
                        });
                        batch.end(cb);
                    } else {
                        cb(null);
                    }
                });
            });
        };
        function lruListNoOp() {}
    });
    require.alias("visionmedia-batch/index.js", "lru-list/deps/batch/index.js");
    require.alias("component-emitter/index.js", "visionmedia-batch/deps/emitter/index.js");
    require.alias("visionmedia-configurable.js/index.js", "lru-list/deps/configurable.js/index.js");
    require.alias("codeactual-is/index.js", "lru-list/deps/is/index.js");
    require.alias("manuelstofer-each/index.js", "codeactual-is/deps/each/index.js");
    require.alias("lru-list/lib/lru-list/index.js", "lru-list/index.js");
    if (typeof exports == "object") {
        module.exports = require("lru-list");
    } else if (typeof define == "function" && define.amd) {
        define(function() {
            return require("lru-list");
        });
    } else {
        window["lruList"] = require("lru-list");
    }
})();