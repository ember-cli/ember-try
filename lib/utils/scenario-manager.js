var CoreObject   = require('core-object');
var BowerHelpers = require('../utils/bower-helpers');
var BowerAdapter = require('./bower-adapter');
var Chalk        = require('chalk');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.dependencyManagerAdapter = new BowerAdapter({cwd: this.project.root});
  },

  setup: function() {
    return this.dependencyManagerAdapter.setup();
  },

  changeTo: function(scenario) {
    var manager = this;
    if (!scenario.dependencies && !scenario.devDependencies) {
      throw new Error('No dependencies specified for scenario ' + scenario.name);
    }
    return manager.dependencyManagerAdapter.changeToDependencySet(scenario)
      .then(function() {
        manager._checkVersions(scenario);
      });
  },

  cleanup: function() {
    return this.dependencyManagerAdapter.cleanup();
  },

  _checkVersions: function(scenario) {
    var manager = this;
    var actualVersion, expectedVersion;
    var pkgs = Object.keys(scenario.dependencies);

    manager.ui.writeLine('For scenario ' + scenario.name + ', using:');

    pkgs.map(function(dep) {

      actualVersion = BowerHelpers.findVersion(dep, manager.project.root);
      expectedVersion = scenario.dependencies[dep];
      if (actualVersion !== expectedVersion) {
        manager.ui.writeLine(Chalk.yellow('Versions do not match: Expected: ' +
         expectedVersion + ' but saw ' + actualVersion +
         ' This might be ok, depending on the scenario'));
      }
      manager.ui.writeLine('  ' + dep + ' ' + actualVersion);
    });
  }
});

