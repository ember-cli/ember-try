var CoreObject   = require('core-object');
var BowerAdapter = require('./bower-adapter');
var Chalk        = require('chalk');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.dependencyManagerAdapter = this.dependencyManagerAdapter || new BowerAdapter({cwd: this.project.root});
  },

  setup: function() {
    return this.dependencyManagerAdapter.setup();
  },

  changeTo: function(scenario) {
    var manager = this;
    if (!scenario.dependencies && !scenario.devDependencies) {
      throw new Error('No dependencies specified for scenario ' + scenario.name);
    }
    return manager.dependencyManagerAdapter.changeToDependencySet(scenario);
  },

  cleanup: function() {
    return this.dependencyManagerAdapter.cleanup();
  }
});

