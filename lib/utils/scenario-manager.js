'use strict';

const CoreObject = require('core-object');

module.exports = CoreObject.extend({
  async setup() {
    let { ui } = this;

    for (let depManager of this.dependencyManagerAdapters) {
      await depManager.setup({ ui });
    }
  },

  async changeTo(scenario) {
    let results = [];
    for (let depManager of this.dependencyManagerAdapters) {
      if (scenario[depManager.configKey]) {
        let depManagerResults = await depManager.changeToDependencySet(
          scenario[depManager.configKey]
        );
        results.push(...depManagerResults);
      }
    }

    return results;
  },

  async cleanup() {
    for (let depManager of this.dependencyManagerAdapters) {
      await depManager.cleanup();
    }
  },
});
