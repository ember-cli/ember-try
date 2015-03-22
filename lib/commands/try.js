'use strict';

var path    = require('path');

/*
  ember try:testall
  ember try 1.10.0 test

 */
module.exports = {
  name: 'try',
  description: 'Run test with the matrix of packages specified',
  works: 'insideProject',

  anonymousOptions: [
    '<version>'
  ],

  run: function(commandOptions, rawArgs) {
    var version = rawArgs[0];

    if (!version) {
      return Promise.reject(new SilentError('The `ember try` command requires a ' +
                                            'version number to be specified. ' +
                                            'For more details, use `ember help`.'));
    }
    return require('../tasks/try')(this.project, version)();
  }
};
