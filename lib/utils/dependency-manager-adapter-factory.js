'use strict';

var BowerAdapter = require('../dependency-manager-adapters/bower');
var NpmAdapter   = require('../dependency-manager-adapters/npm');
var YarnAdapter   = require('../dependency-manager-adapters/yarn');
var debug         = require('debug')('ember-try:utils:dependency-manager-adapter-factory');

module.exports = {
  generateFromConfig: function(config, root, task) {
    var hasNpm = false;
    var hasBower = false;
    var hasYarn = false;
    var adapters = [];
    if (!config || !config.scenarios) {
      return [];
    }

    config.scenarios.forEach(function(scenario) {
      if (scenario.npm) {
        hasNpm = true;
      }
      if (scenario.yarn) {
        hasYarn = true;
      }
      if (scenario.bower || scenario.dependencies || scenario.devDependencies) {
        hasBower = true;
      }
    });
    if (hasNpm && hasYarn) {
      debug('Ember-try config file can not have both npm and yarn dependency managers. Please use either one or the other.');
      task._exit(1);
    }
    if (hasNpm) {
      adapters.push(new NpmAdapter({cwd: root, managerOptions: config.npmOptions}));
    }
    if (hasBower) {
      adapters.push(new BowerAdapter({cwd: root, managerOptions: config.bowerOptions}));
    }
    if (hasYarn) {
      adapters.push(new YarnAdapter({cwd: root, managerOptions: config.yarnOptions}));
    }
    return adapters;
  }
};
