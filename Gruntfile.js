module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-shell');

  var mochaShelljsOpt = {stdout: true, stderr: false};

  grunt.initConfig({
    jshint: {
      src: {
        files: {
          src: ['index.js', 'lib/**/*.js']
        }
      },
      grunt: {
        files: {
          src: ['Gruntfile.js']
        }
      },
      tests: {
        options: {
          expr: true
        },
        files: {
          src: ['test/lib/**/*.js']
        }
      },
      json: {
        files: {
          src: ['*.json']
        }
      }
    },
    uglify: {
      dist: {
        options: {
          compress: false,
          mangle: false,
          beautify: true
        },
        files: {
          'dist/lru-list.js': 'dist/lru-list.js'
        }
      }
    },
    shell: {
      options: {
        failOnError: true
      },
      build: {
        command: 'component install --dev && component build --standalone lruList --name lru-list --out dist --dev'
      },
      dist: {
        command: 'component build --standalone lruList --name lru-list --out dist'
      },
      shrinkwrap: {
        command: 'npm shrinkwrap'
      },
      test_lib: {
        options: mochaShelljsOpt,
        command: "mocha --colors --reporter spec --recursive test/lib"
      },
      dox_lib: {
        command: 'gitemplate-dox --input lib/lru-list/index.js --output docs/lru-list.md'
      }
    }
  });

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('dox', ['shell:dox_lib']);
  grunt.registerTask('build', ['default', 'shell:build']);
  grunt.registerTask('dist', ['default', 'shell:dist', 'uglify:dist', 'shell:shrinkwrap', 'dox']);
  grunt.registerTask('test', ['build', 'shell:test_lib']);
};
