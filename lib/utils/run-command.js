'use strict';

var RSVP          = require('rsvp');
var extend        = require('extend');
var findEmberPath = require('./find-ember-path');
var run           = require('./run');

module.exports = function(root, commandArgs, opts) {
  var options = extend({ cwd: root }, opts);
  var runPromise;
  var command = commandArgs[0];
  var actualArgs = commandArgs.slice(1);

  if (command === 'ember') {
    runPromise = findEmberPath(root).then(function(emberPath) {
      return run('node', [].concat(emberPath, actualArgs), options);
    });
  } else {
    runPromise = run(command, actualArgs, options);
  }

  return runPromise.then(function() {
    return RSVP.resolve(true);
  }).catch(function(errorCode) {
    if (errorCode !== 1) {
      return RSVP.reject('The command ' + commandArgs.join(' ') + ' exited ' + errorCode);
    } else {
      return RSVP.resolve(false);
    }
  });
};
