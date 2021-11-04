'use strict';

const NpmAdapter = require('../dependency-manager-adapters/npm');
const PnpmAdapter = require('../dependency-manager-adapters/pnpm');
const WorkspaceAdapter = require('../dependency-manager-adapters/workspace');

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

    if (hasBower) {
      throw new Error('[ember-try] bower configuration is no longer supported');
    }

    if (config.useWorkspaces) {
      adapters.push(
        new WorkspaceAdapter({
          cwd: root,
          managerOptions: config.npmOptions,
          useYarnCommand: config.useYarn,
          buildManagerOptions: config.buildManagerOptions,
        })
      );
    } else if (config.usePnpm) {
      console.warn(
        'pnpm support is experimental for now. if you notice any problems please open an issue.'
      );

      adapters.push(
        new PnpmAdapter({
          cwd: root,
          managerOptions: config.npmOptions,
          buildManagerOptions: config.buildManagerOptions,
        })
      );
    } else if (hasNpm) {
      adapters.push(
        new NpmAdapter({
          cwd: root,
          managerOptions: config.npmOptions,
          useYarnCommand: config.useYarn,
          buildManagerOptions: config.buildManagerOptions,
        })
      );
    }

    return adapters;
  },
};
