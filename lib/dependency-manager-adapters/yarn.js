'use strict';

var PackageJSONBase = require('./package-json-base');
var debug = require('debug');

module.exports = PackageJSONBase.extend({
  debug: debug('ember-try:dependency-manager-adapter:yarn'),
  messages: {
    cleanupMessage: 'Remove backup package.json, node_modules and yarn.lock',
    cleanupErrorMessage: 'Error cleaning up yarn scenario:',
    restoreMessage: 'Restoring original package.json, node_modules and yarn.lock',
    backupMessage: 'Backing up package.json, node_modules and yarn.lock',
    writeDepSetMessage: 'Write package.json with: \n'
  },
  restoreLocations: [
    {
      location: 'package.json',
      backup: 'package.json.ember-try',
      clobber: undefined
    },
    {
      location: 'yarn.lock',
      backup: 'yarn.lock.ember-try',
      clobber: undefined
    },
    {
      location: 'node_modules',
      backup: '.node_modules.ember-try',
      clobber: true
    }
  ],

  packageManager: 'yarn',

  _install: function() {
    let options = this.managerOptions || [];

    this.debug('Run yarn with options %s', options);

    return this.run('yarn', [].concat(['install'], options), { cwd: this.cwd });
  }
});
