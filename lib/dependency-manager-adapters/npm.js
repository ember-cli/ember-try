'use strict';

var PackageJSONBase = require('./package-json-base');
var debug           = require('debug');

module.exports = PackageJSONBase.extend({
  debug: debug('ember-try:dependency-manager-adapter:npm'),
  messages: {
    cleanupMessage: 'Remove backup package.json and node_modules',
    cleanupErrorMessage: 'Error cleaning up npm scenario:',
    restoreMessage: 'Restoring original package.json and node_modules',
    backupMessage: 'Backing up package.json and node_modules',
    writeDepSetMessage: 'Write package.json with: \n'
  },
  restoreLocations: [
    {
      location: 'package.json',
      backup: 'package.json.ember-try',
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
  packageManager: 'npm',

  configKey: 'npm',

  _install: function() {
    var adapter = this;
    var options = this.managerOptions || [];

    adapter.debug('Run npm install with options %s', options);

    return adapter.run('npm', [].concat(['install'], options), {cwd: adapter.cwd}).then(function() {
      adapter.debug('Run npm prune');
      return adapter.run('npm', [].concat(['prune'], options), {cwd: adapter.cwd});
    });
  }
});
