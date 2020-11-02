'use strict';

const CoreObject = require('core-object');

module.exports = CoreObject.extend({
  async setup() {},

  async changeToDependencySet() {
    return [
      {
        name: 'testDep',
        versionExpected: '2.0.0',
        versionSeen: '2.1.0',
      },
    ];
  },

  async restoreOriginalDependencies() {},

  async cleanup() {},
});
