var RSVP          = require('rsvp');
var extend        = require('extend');
var findEmberPath = require('./find-ember-path');
var run           = require('./run');

module.exports = function(root, commandArgs, opts) {
  var options;
  return findEmberPath(root)
    .then(function(emberPath) {
      options = extend({cwd: root}, opts);
      return run('node', [].concat(emberPath, commandArgs), options);
    })
    .then(function() {
      return RSVP.resolve(true);
    })
    .catch(function(errorCode) {
      if (errorCode != 1) {
        return RSVP.reject('The command ' + commandArgs.join(' ') + ' exited ' + errorCode);
      } else {
        return RSVP.resolve(false);
      }
    });
};
