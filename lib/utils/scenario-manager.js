'use strict';

module.exports = class ScenarioManager {
  constructor(options) {
    this.dependencyManagerAdapters = options.dependencyManagerAdapters;
  }

  async setup() {
    for (let depManager of this.dependencyManagerAdapters) {
      await depManager.setup();
    }
  }

  async changeTo(scenario) {
    let results = [];

    for (let depManager of this.dependencyManagerAdapters) {
      if ('packageJson' in scenario) {
        let depManagerResults = await depManager.changePackage(
          scenario.packageJson
        );
        results.push(...depManagerResults);
      }

      if (scenario[depManager.configKey]) {
        let depManagerResults = await depManager.changeToDependencySet(
          scenario[depManager.configKey],
        );
        results.push(...depManagerResults);
      }
    }

    return results;
  }

  async cleanup() {
    for (let depManager of this.dependencyManagerAdapters) {
      await depManager.cleanup();
    }
  }
};
