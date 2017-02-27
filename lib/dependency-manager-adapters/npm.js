'use strict';

const PackageJSONBase = require('./package-json-base');
const debug = require('debug');

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

  packageManager: 'npm',

  _install() {
    let options = this.managerOptions || [];

    this.debug('Run npm install with options %s', options);

    return this.run('npm', [].concat(['install'], options), { cwd: this.cwd }).then(() => {
      this.debug('Run npm prune');
      return this.run('npm', [].concat(['prune'], options), { cwd: this.cwd });
    });
  }
});
