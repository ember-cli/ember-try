'use strict';

var glob = require('glob').sync;

var paths = glob('test/*').filter(function(path) {
  return !/fixtures/.test(path);
});

paths = paths.concat([
  'lib'
]);

require('mocha-eslint')(paths);
