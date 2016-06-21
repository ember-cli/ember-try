/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-try',
  init: function() {
    this._super.init && this._super.init.apply(this, arguments);
    if (this.project.pkg.devDependencies && this.project.pkg.devDependencies['ember-try']) {
      this.ui.writeDeprecateLine('ember-try is now included with ember-cli. Including it in your package.json is unnecssary.');
    }
  },
  includedCommands: function() {
    return require('./lib/commands');
  }
};
