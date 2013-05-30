module.exports = function(grunt) {
  'use strict';

  require('grunt-horde')
    .create(grunt)
    .demand('projName', 'lru-list')
    .demand('instanceName', 'lruList')
    .demand('klassName', 'LRUList')
    .loot('node-component-grunt')
    .attack();
};
