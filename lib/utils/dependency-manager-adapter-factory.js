'use strict';

const BowerAdapter = require('../dependency-manager-adapters/bower');
const NpmAdapter = require('../dependency-manager-adapters/npm');

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
    if (hasNpm || hasBower) {
      adapters.push(new NpmAdapter({ cwd: root, managerOptions: config.npmOptions, useYarnCommand: config.useYarn }));
      adapters.push(new BowerAdapter({ cwd: root, managerOptions: config.bowerOptions }));
    }
    return adapters;
  },
};
