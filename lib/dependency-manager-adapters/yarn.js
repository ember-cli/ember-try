'use strict';

var PackageJSONBase = require('./package-json-base');
var debug           = require('debug');

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

  depFile: 'package.json',
  backupDepFile: 'package.json.ember-try',
  packageManager: 'yarn',

  configKey: 'yarn',

  _install: function() {
    var adapter = this;
    var options = this.managerOptions || [];

    adapter.debug('Run yarn with options %s', options);

    return adapter.run('yarn', [].concat(options), {cwd: adapter.cwd});
  },
});
