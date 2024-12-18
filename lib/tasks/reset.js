'use strict';

const debug = require('debug')('ember-try:commands:reset');
const ScenarioManager = require('../utils/scenario-manager');
const DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

module.exports = class ResetTask {
  constructor(options) {
    this.config = options.config;
    this.cwd = options.cwd;
  }

  run() {
    let dependencyAdapters = DependencyManagerAdapterFactory.generateFromConfig(
      this.config,
      this.cwd,
    );
    debug(
      'DependencyManagerAdapters: %s',
      dependencyAdapters.map((item) => {
        return item.configKey;
      }),
    );
    return new ScenarioManager({ dependencyManagerAdapters: dependencyAdapters }).cleanup();
  }
};
