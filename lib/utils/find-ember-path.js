'use strict';

const path = require('path');
const utils = require('util');
const resolve = utils.promisify(require('resolve'));

module.exports = async function (root) {
  /* Find ember-cli's entry point module relative to
     the current projects root */
  let emberPath = await resolve('ember-cli', { basedir: root });

  // Return the path to the ember command script
  return path.join(emberPath, '..', '..', '..', 'bin', 'ember');
};
