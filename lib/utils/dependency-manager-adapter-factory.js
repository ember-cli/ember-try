'use strict';

let BowerAdapter = require('../dependency-manager-adapters/bower');
let NpmAdapter = require('../dependency-manager-adapters/npm');

module.exports = {
  generateFromConfig(config, root) {
    let hasNpm = false;
    let hasBower = false;
    let adapters = [];
    if (!config || !config.scenarios) {
      return [];
    }

    config.scenarios.forEach((scenario) => {
      if (scenario.npm) {
        hasNpm = true;
      }
      if (scenario.bower || scenario.dependencies || scenario.devDependencies) {
        hasBower = true;
      }
    });
    if (hasNpm) {
      adapters.push(new NpmAdapter({ cwd: root, managerOptions: config.npmOptions, useYarnCommand: config.useYarn }));
    }
    if (hasBower) {
      adapters.push(new BowerAdapter({ cwd: root, managerOptions: config.bowerOptions }));
    }
    return adapters;
  },
};
