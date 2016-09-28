/* jshint node: true */
'use strict';

var VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'ember-try',
  init: function() {
    this._super.init && this._super.init.apply(this, arguments);

    var checker = new VersionChecker(this);
    var cliVersion = checker.for('ember-cli', 'npm');

    if (cliVersion.satisfies('>= 2.6.0') && this.project.pkg.devDependencies && this.project.pkg.devDependencies['ember-try']) {
      this.ui.writeDeprecateLine('ember-try is now included with ember-cli. Including it in your package.json is unnecessary.');
    }
  },
  includedCommands: function() {
    return require('./lib/commands');
  }
};
