'use strict';
let CoreObject = require('core-object');
let debug = require('debug')('ember-try:commands:reset');
let ScenarioManager = require('../utils/scenario-manager');
let DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

module.exports = CoreObject.extend({
  run() {
    let dependencyAdapters = this.dependencyManagerAdapters || DependencyManagerAdapterFactory.generateFromConfig(this.config, this.project.root);
    debug('DependencyManagerAdapters: %s', dependencyAdapters.map((item) => { return item.configKey; }));
    return new ScenarioManager({ dependencyManagerAdapters: dependencyAdapters }).cleanup();
  },
});
