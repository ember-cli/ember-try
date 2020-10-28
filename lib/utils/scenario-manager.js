'use strict';

const CoreObject = require('core-object');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this._checkDependencyManagerAdapters();
  },

  _checkDependencyManagerAdapters() {
    if (!this.dependencyManagerAdapters || this.dependencyManagerAdapters.length === 0) {
      throw new Error('No dependency manager adapter');
    }
  },

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
        let depManagerResults = await depManager.changeToDependencySet(scenario[depManager.configKey]);
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

