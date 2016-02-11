'use strict';
var CoreObject      = require('core-object');
var ScenarioManager = require('../utils/scenario-manager');
var DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

module.exports = CoreObject.extend({
  run: function() {
    var dependencyAdapters = this.dependencyManagerAdapters || DependencyManagerAdapterFactory.generateFromConfig(this.config, this.project.root);
    return new ScenarioManager({ dependencyManagerAdapters: dependencyAdapters }).cleanup();
  }
});
