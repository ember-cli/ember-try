var RSVP          = require('rsvp');
var findEmberPath = require('./find-ember-path');
var run           = require('./run');

module.exports = function(root, commandArgs) {
  return findEmberPath(root)
    .then(function(emberPath) {
      return run('node', [emberPath, commandArgs], {cwd: root});
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
