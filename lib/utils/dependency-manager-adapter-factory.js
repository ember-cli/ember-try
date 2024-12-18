'use strict';

const NpmAdapter = require('../dependency-manager-adapters/npm');
const PnpmAdapter = require('../dependency-manager-adapters/pnpm');
const WorkspaceAdapter = require('../dependency-manager-adapters/workspace');
const YarnAdapter = require('../dependency-manager-adapters/yarn');

module.exports = {
  generateFromConfig(config, cwd) {
    let hasNpm = false;
    let adapters = [];
    if (!config || !config.scenarios) {
      return [];
    }

    config.scenarios.forEach((scenario) => {
      if (scenario.npm) {
        hasNpm = true;
      }
    });

    if (config.useWorkspaces) {
      adapters.push(
        new WorkspaceAdapter({
          cwd,
          managerOptions: config.npmOptions,
          packageManager: config.packageManager,
          buildManagerOptions: config.buildManagerOptions,
        }),
      );
    } else if (config.packageManager === 'pnpm') {
      adapters.push(
        new PnpmAdapter({
          cwd,
          managerOptions: config.npmOptions,
          buildManagerOptions: config.buildManagerOptions,
        }),
      );
    } else if (config.packageManager === 'yarn') {
      adapters.push(
        new YarnAdapter({
          cwd,
          managerOptions: config.npmOptions,
          buildManagerOptions: config.buildManagerOptions,
        }),
      );
    } else if (hasNpm) {
      adapters.push(
        new NpmAdapter({
          cwd,
          managerOptions: config.npmOptions,
          buildManagerOptions: config.buildManagerOptions,
        }),
      );
    }

    return adapters;
  },
};
