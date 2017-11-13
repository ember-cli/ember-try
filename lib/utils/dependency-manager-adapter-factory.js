'use strict';

var BowerAdapter = require('../dependency-manager-adapters/bower');
var NpmAdapter = require('../dependency-manager-adapters/npm');

module.exports = {
  generateFromConfig: function(config, root) {
    var hasNpm = false;
    var hasBower = false;
    var adapters = [];
    if (!config || !config.scenarios) {
      return [];
    }

    config.scenarios.forEach(function(scenario) {
      if (scenario.npm) {
        hasNpm = true;
      }
      if (scenario.bower || scenario.dependencies || scenario.devDependencies) {
        hasBower = true;
      }
    });
    if (hasNpm || hasBower) {
      adapters.push(new NpmAdapter({ cwd: root, managerOptions: config.npmOptions, useYarnCommand: config.useYarn }));
      adapters.push(new BowerAdapter({ cwd: root, managerOptions: config.bowerOptions }));
    }
    return adapters;
  }
};
