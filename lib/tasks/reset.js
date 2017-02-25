'use strict';
var CoreObject = require('core-object');
var debug = require('debug')('ember-try:commands:reset');
var ScenarioManager = require('../utils/scenario-manager');
var DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

module.exports = CoreObject.extend({
  run: function() {
    var dependencyAdapters = this.dependencyManagerAdapters || DependencyManagerAdapterFactory.generateFromConfig(this.config, this.project.root);
    debug('DependencyManagerAdapters: %s', dependencyAdapters.map(function(item) { return item.configKey; }));
    return new ScenarioManager({ dependencyManagerAdapters: dependencyAdapters }).cleanup();
  }
});
