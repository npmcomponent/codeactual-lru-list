module.exports = function(grunt) {
  'use strict';

  require('grunt-horde')
    .create(grunt)
    .demand('initConfig.projName', 'lru-list')
    .demand('initConfig.instanceName', 'lruList')
    .demand('initConfig.klassName', 'LRUList')
    .loot('node-component-grunt')
    .attack();
};
