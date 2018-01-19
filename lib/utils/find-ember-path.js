'use strict';

let path = require('path');
let RSVP = require('rsvp');
let resolve = RSVP.denodeify(require('resolve'));

module.exports = function(root) {
  /* Find ember-cli's entry point module relative to
     the current projects root */
  return resolve('ember-cli', { basedir: root })
    .then((emberPath) => {
      // Return the path to the ember command script
      return path.join(emberPath, '..', '..', '..', 'bin', 'ember');
    });
};
